import React, {memo, useCallback} from 'react'
import {
  Pressable,
  type PressableStateCallbackType,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native'
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import * as Clipboard from 'expo-clipboard'
import {
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyFeedThreadgate,
  AtUri,
  RichText as RichTextAPI,
} from '@atproto/api'
import {msg, plural} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {POST_CTRL_HITSLOP} from '#/lib/constants'
import {useHaptics} from '#/lib/haptics'
import {makeProfileLink} from '#/lib/routes/links'
import {shareUrl} from '#/lib/sharing'
import {useGate} from '#/lib/statsig/statsig'
import {toShareUrl} from '#/lib/strings/url-helpers'
import {s} from '#/lib/styles'
import {isWeb} from '#/platform/detection'
import {Shadow} from '#/state/cache/types'
import {useFeedFeedbackContext} from '#/state/feed-feedback'
import {
  usePostLikeMutationQueue,
  usePostRepostMutationQueue,
} from '#/state/queries/post'
import {useRequireAuth, useSession} from '#/state/session'
import {useComposerControls} from '#/state/shell/composer'
import {
  ProgressGuideAction,
  useProgressGuideControls,
} from '#/state/shell/progress-guide'
import {atoms as a, useTheme} from '#/alf'
import {useDialogControl} from '#/components/Dialog'
import {ArrowOutOfBox_Stroke2_Corner0_Rounded as ArrowOutOfBox} from '#/components/icons/ArrowOutOfBox'
import {Bubble_Stroke2_Corner2_Rounded as Bubble} from '#/components/icons/Bubble'
import {
  Heart2_Filled_Stroke2_Corner0_Rounded as HeartIconFilled,
  Heart2_Stroke2_Corner0_Rounded as HeartIconOutline,
} from '#/components/icons/Heart2'
import * as Prompt from '#/components/Prompt'
import {PlatformInfo} from '../../../../../modules/expo-bluesky-swiss-army'
import {PostDropdownBtn} from '../forms/PostDropdownBtn'
import {formatCount} from '../numeric/format'
import {Text} from '../text/Text'
import * as Toast from '../Toast'
import {RepostButton} from './RepostButton'

let PostCtrls = ({
  big,
  post,
  record,
  richText,
  feedContext,
  style,
  onPressReply,
  onPostReply,
  logContext,
  threadgateRecord,
}: {
  big?: boolean
  post: Shadow<AppBskyFeedDefs.PostView>
  record: AppBskyFeedPost.Record
  richText: RichTextAPI
  feedContext?: string | undefined
  style?: StyleProp<ViewStyle>
  onPressReply: () => void
  onPostReply?: (postUri: string | undefined) => void
  logContext: 'FeedItem' | 'PostThreadItem' | 'Post'
  threadgateRecord?: AppBskyFeedThreadgate.Record
}): React.ReactNode => {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const {openComposer} = useComposerControls()
  const {currentAccount} = useSession()
  const [queueLike, queueUnlike] = usePostLikeMutationQueue(post, logContext)
  const [queueRepost, queueUnrepost] = usePostRepostMutationQueue(
    post,
    logContext,
  )
  const requireAuth = useRequireAuth()
  const loggedOutWarningPromptControl = useDialogControl()
  const {sendInteraction} = useFeedFeedbackContext()
  const {captureAction} = useProgressGuideControls()
  const playHaptic = useHaptics()
  const gate = useGate()
  const isBlocked = Boolean(
    post.author.viewer?.blocking ||
      post.author.viewer?.blockedBy ||
      post.author.viewer?.blockingByList,
  )

  const shouldShowLoggedOutWarning = React.useMemo(() => {
    return (
      post.author.did !== currentAccount?.did &&
      !!post.author.labels?.find(label => label.val === '!no-unauthenticated')
    )
  }, [currentAccount, post])

  const defaultCtrlColor = React.useMemo(
    () => ({
      color: t.palette.contrast_500,
    }),
    [t],
  ) as StyleProp<ViewStyle>

  const likeValue = post.viewer?.like ? 1 : 0
  const likeIconAnimValue = useSharedValue(likeValue)
  const likeTextAnimValue = useSharedValue(likeValue)
  const nextExpectedLikeValue = React.useRef(likeValue)
  React.useEffect(() => {
    // Catch nonlocal changes (e.g. shadow update) and always reflect them.
    if (likeValue !== nextExpectedLikeValue.current) {
      nextExpectedLikeValue.current = likeValue
      likeIconAnimValue.value = likeValue
      likeTextAnimValue.value = likeValue
    }
  }, [likeValue, likeIconAnimValue, likeTextAnimValue])

  const onPressToggleLike = React.useCallback(async () => {
    if (isBlocked) {
      Toast.show(
        _(msg`Cannot interact with a blocked user`),
        'exclamation-circle',
      )
      return
    }

    try {
      if (!post.viewer?.like) {
        nextExpectedLikeValue.current = 1
        if (PlatformInfo.getIsReducedMotionEnabled()) {
          likeIconAnimValue.value = 1
          likeTextAnimValue.value = 1
        } else {
          likeIconAnimValue.value = withTiming(1, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
          })
          likeTextAnimValue.value = withTiming(1, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
          })
        }
        playHaptic()
        sendInteraction({
          item: post.uri,
          event: 'app.bsky.feed.defs#interactionLike',
          feedContext,
        })
        captureAction(ProgressGuideAction.Like)
        await queueLike()
      } else {
        nextExpectedLikeValue.current = 0
        likeIconAnimValue.value = 0 // Intentionally not animated
        if (PlatformInfo.getIsReducedMotionEnabled()) {
          likeTextAnimValue.value = 0
        } else {
          likeTextAnimValue.value = withTiming(0, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
          })
        }
        await queueUnlike()
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        throw e
      }
    }
  }, [
    _,
    likeIconAnimValue,
    likeTextAnimValue,
    playHaptic,
    post.uri,
    post.viewer?.like,
    queueLike,
    queueUnlike,
    sendInteraction,
    captureAction,
    feedContext,
    isBlocked,
  ])

  const onRepost = useCallback(async () => {
    if (isBlocked) {
      Toast.show(
        _(msg`Cannot interact with a blocked user`),
        'exclamation-circle',
      )
      return
    }

    try {
      if (!post.viewer?.repost) {
        sendInteraction({
          item: post.uri,
          event: 'app.bsky.feed.defs#interactionRepost',
          feedContext,
        })
        await queueRepost()
      } else {
        await queueUnrepost()
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        throw e
      }
    }
  }, [
    _,
    post.uri,
    post.viewer?.repost,
    queueRepost,
    queueUnrepost,
    sendInteraction,
    feedContext,
    isBlocked,
  ])

  const onQuote = useCallback(() => {
    if (isBlocked) {
      Toast.show(
        _(msg`Cannot interact with a blocked user`),
        'exclamation-circle',
      )
      return
    }

    sendInteraction({
      item: post.uri,
      event: 'app.bsky.feed.defs#interactionQuote',
      feedContext,
    })
    openComposer({
      quote: {
        uri: post.uri,
        cid: post.cid,
        text: record.text,
        author: post.author,
        indexedAt: post.indexedAt,
      },
      quoteCount: post.quoteCount,
      onPost: onPostReply,
    })
  }, [
    _,
    sendInteraction,
    post.uri,
    post.cid,
    post.author,
    post.indexedAt,
    post.quoteCount,
    feedContext,
    openComposer,
    record.text,
    onPostReply,
    isBlocked,
  ])

  const onShare = useCallback(() => {
    const urip = new AtUri(post.uri)
    const href = makeProfileLink(post.author, 'post', urip.rkey)
    const url = toShareUrl(href)
    shareUrl(url)
    sendInteraction({
      item: post.uri,
      event: 'app.bsky.feed.defs#interactionShare',
      feedContext,
    })
  }, [post.uri, post.author, sendInteraction, feedContext])

  const btnStyle = React.useCallback(
    ({pressed, hovered}: PressableStateCallbackType) => [
      a.gap_xs,
      a.rounded_full,
      a.flex_row,
      a.align_center,
      a.justify_center,
      {padding: 5},
      (pressed || hovered) && t.atoms.bg_contrast_25,
    ],
    [t.atoms.bg_contrast_25],
  )

  return (
    <View style={[a.flex_row, a.justify_between, a.align_center, style]}>
      <View
        style={[
          big ? a.align_center : [a.flex_1, a.align_start, {marginLeft: -6}],
          post.viewer?.replyDisabled ? {opacity: 0.5} : undefined,
        ]}>
        <Pressable
          testID="replyBtn"
          style={btnStyle}
          onPress={() => {
            if (!post.viewer?.replyDisabled) {
              requireAuth(() => onPressReply())
            }
          }}
          accessibilityLabel={plural(post.replyCount || 0, {
            one: 'Reply (# reply)',
            other: 'Reply (# replies)',
          })}
          accessibilityHint=""
          hitSlop={POST_CTRL_HITSLOP}>
          <Bubble
            style={[defaultCtrlColor, {pointerEvents: 'none'}]}
            width={big ? 22 : 18}
          />
          {typeof post.replyCount !== 'undefined' && post.replyCount > 0 ? (
            <Text
              style={[
                defaultCtrlColor,
                big ? a.text_md : {fontSize: 15},
                a.user_select_none,
              ]}>
              {formatCount(i18n, post.replyCount)}
            </Text>
          ) : undefined}
        </Pressable>
      </View>
      <View style={big ? a.align_center : [a.flex_1, a.align_start]}>
        <RepostButton
          isReposted={!!post.viewer?.repost}
          repostCount={(post.repostCount ?? 0) + (post.quoteCount ?? 0)}
          onRepost={onRepost}
          onQuote={onQuote}
          big={big}
          embeddingDisabled={Boolean(post.viewer?.embeddingDisabled)}
        />
      </View>
      <View style={big ? a.align_center : [a.flex_1, a.align_start]}>
        <Pressable
          testID="likeBtn"
          style={btnStyle}
          onPress={() => requireAuth(() => onPressToggleLike())}
          accessibilityLabel={
            post.viewer?.like
              ? plural(post.likeCount || 0, {
                  one: 'Unlike (# like)',
                  other: 'Unlike (# likes)',
                })
              : plural(post.likeCount || 0, {
                  one: 'Like (# like)',
                  other: 'Like (# likes)',
                })
          }
          accessibilityHint=""
          hitSlop={POST_CTRL_HITSLOP}>
          <AnimatedLikeIcon
            big={big ?? false}
            likeIconAnimValue={likeIconAnimValue}
            likeTextAnimValue={likeTextAnimValue}
            defaultCtrlColor={defaultCtrlColor}
            isLiked={Boolean(post.viewer?.like)}
            likeCount={post.likeCount ?? 0}
          />
        </Pressable>
      </View>
      {big && (
        <>
          <View style={a.align_center}>
            <Pressable
              testID="shareBtn"
              style={btnStyle}
              onPress={() => {
                if (shouldShowLoggedOutWarning) {
                  loggedOutWarningPromptControl.open()
                } else {
                  onShare()
                }
              }}
              accessibilityLabel={_(msg`Share`)}
              accessibilityHint=""
              hitSlop={POST_CTRL_HITSLOP}>
              <ArrowOutOfBox
                style={[defaultCtrlColor, {pointerEvents: 'none'}]}
                width={22}
              />
            </Pressable>
          </View>
          <Prompt.Basic
            control={loggedOutWarningPromptControl}
            title={_(msg`Note about sharing`)}
            description={_(
              msg`This post is only visible to logged-in users. It won't be visible to people who aren't logged in.`,
            )}
            onConfirm={onShare}
            confirmButtonCta={_(msg`Share anyway`)}
          />
        </>
      )}
      <View style={big ? a.align_center : [a.flex_1, a.align_start]}>
        <PostDropdownBtn
          testID="postDropdownBtn"
          post={post}
          postFeedContext={feedContext}
          record={record}
          richText={richText}
          style={{padding: 5}}
          hitSlop={POST_CTRL_HITSLOP}
          timestamp={post.indexedAt}
          threadgateRecord={threadgateRecord}
        />
      </View>
      {gate('debug_show_feedcontext') && feedContext && (
        <Pressable
          accessible={false}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
          onPress={e => {
            e.stopPropagation()
            Clipboard.setStringAsync(feedContext)
            Toast.show(_(msg`Copied to clipboard`), 'clipboard-check')
          }}>
          <Text
            style={{
              color: t.palette.contrast_400,
              fontSize: 7,
            }}>
            {feedContext}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
PostCtrls = memo(PostCtrls)
export {PostCtrls}

function AnimatedLikeIcon({
  big,
  likeIconAnimValue,
  likeTextAnimValue,
  defaultCtrlColor,
  isLiked,
  likeCount,
}: {
  big: boolean
  likeIconAnimValue: SharedValue<number>
  likeTextAnimValue: SharedValue<number>
  defaultCtrlColor: StyleProp<ViewStyle>
  isLiked: boolean
  likeCount: number
}) {
  const t = useTheme()
  const {i18n} = useLingui()
  const likeStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          likeIconAnimValue.value,
          [0, 0.1, 0.4, 1],
          [1, 0.7, 1.2, 1],
          'clamp',
        ),
      },
    ],
  }))
  const circle1Style = useAnimatedStyle(() => ({
    opacity: interpolate(
      likeIconAnimValue.value,
      [0, 0.1, 0.95, 1],
      [0, 0.4, 0.4, 0],
      'clamp',
    ),
    transform: [
      {
        scale: interpolate(
          likeIconAnimValue.value,
          [0, 0.4, 1],
          [0, 1.5, 1.5],
          'clamp',
        ),
      },
    ],
  }))
  const circle2Style = useAnimatedStyle(() => ({
    opacity: interpolate(
      likeIconAnimValue.value,
      [0, 0.1, 0.95, 1],
      [0, 1, 1, 0],
      'clamp',
    ),
    transform: [
      {
        scale: interpolate(
          likeIconAnimValue.value,
          [0, 0.4, 1],
          [0, 0, 1.5],
          'clamp',
        ),
      },
    ],
  }))
  const countStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          likeTextAnimValue.value,
          [0, 1],
          [0, big ? -22 : -18],
          'clamp',
        ),
      },
    ],
  }))

  const prevFormattedCount = formatCount(
    i18n,
    isLiked ? likeCount - 1 : likeCount,
  )
  const nextFormattedCount = formatCount(
    i18n,
    isLiked ? likeCount : likeCount + 1,
  )
  const shouldRollLike =
    prevFormattedCount !== nextFormattedCount && prevFormattedCount !== '0'

  return (
    <>
      <View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              backgroundColor: s.likeColor.color,
              top: 0,
              left: 0,
              width: big ? 22 : 18,
              height: big ? 22 : 18,
              zIndex: -1,
              pointerEvents: 'none',
              borderRadius: (big ? 22 : 18) / 2,
            },
            circle1Style,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              backgroundColor: isWeb
                ? t.atoms.bg_contrast_25.backgroundColor
                : t.atoms.bg.backgroundColor,
              top: 0,
              left: 0,
              width: big ? 22 : 18,
              height: big ? 22 : 18,
              zIndex: -1,
              pointerEvents: 'none',
              borderRadius: (big ? 22 : 18) / 2,
            },
            circle2Style,
          ]}
        />
        <Animated.View style={likeStyle}>
          {isLiked ? (
            <HeartIconFilled style={s.likeColor} width={big ? 22 : 18} />
          ) : (
            <HeartIconOutline
              style={[defaultCtrlColor, {pointerEvents: 'none'}]}
              width={big ? 22 : 18}
            />
          )}
        </Animated.View>
      </View>
      <View style={{overflow: 'hidden'}}>
        <Text
          testID="likeCount"
          style={[
            [
              big ? a.text_md : {fontSize: 15},
              a.user_select_none,
              isLiked ? [a.font_bold, s.likeColor] : defaultCtrlColor,
              {opacity: shouldRollLike ? 0 : 1},
            ],
          ]}>
          {likeCount > 0 ? formatCount(i18n, likeCount) : ''}
        </Text>
        <Animated.View
          aria-hidden={true}
          style={[
            countStyle,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: shouldRollLike ? 1 : 0,
            },
          ]}>
          <Text
            testID="likeCount"
            style={[
              [
                big ? a.text_md : {fontSize: 15},
                a.user_select_none,
                isLiked ? [a.font_bold, s.likeColor] : defaultCtrlColor,
                {height: big ? 22 : 18},
              ],
            ]}>
            {prevFormattedCount}
          </Text>
          <Text
            testID="likeCount"
            style={[
              [
                big ? a.text_md : {fontSize: 15},
                a.user_select_none,
                isLiked ? [a.font_bold, s.likeColor] : defaultCtrlColor,
                {height: big ? 22 : 18},
              ],
            ]}>
            {nextFormattedCount}
          </Text>
        </Animated.View>
      </View>
    </>
  )
}
