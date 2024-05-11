import React, {memo} from 'react'
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native'
import {AppBskyActorDefs} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {FALLBACK_MARKER_POST} from '#/lib/api/feed/home'
import {KNOWN_SHUTDOWN_FEEDS} from '#/lib/constants'
import {logEvent} from '#/lib/statsig/statsig'
import {logger} from '#/logger'
import {isWeb} from '#/platform/detection'
import {listenPostCreated} from '#/state/events'
import {useFeedFeedbackContext} from '#/state/feed-feedback'
import {STALE} from '#/state/queries'
import {
  FeedDescriptor,
  FeedParams,
  pollLatest,
  RQKEY,
  usePostFeedQuery,
} from '#/state/queries/post-feed'
import {useSession} from '#/state/session'
import {useAnalytics} from 'lib/analytics/analytics'
import {useInitialNumToRender} from 'lib/hooks/useInitialNumToRender'
import {useTheme} from 'lib/ThemeContext'
import {List, ListRef} from '../util/List'
import {PostFeedLoadingPlaceholder} from '../util/LoadingPlaceholder'
import {LoadMoreRetryBtn} from '../util/LoadMoreRetryBtn'
import {DiscoverFallbackHeader} from './DiscoverFallbackHeader'
import {FeedErrorMessage} from './FeedErrorMessage'
import {FeedShutdownMsg} from './FeedShutdownMsg'
import {FeedSlice} from './FeedSlice'

const LOADING_ITEM = {_reactKey: '__loading__'}
const EMPTY_FEED_ITEM = {_reactKey: '__empty__'}
const ERROR_ITEM = {_reactKey: '__error__'}
const LOAD_MORE_ERROR_ITEM = {_reactKey: '__load_more_error__'}
const FEED_SHUTDOWN_MSG_ITEM = {_reactKey: '__feed_shutdown_msg_item__'}

// DISABLED need to check if this is causing random feed refreshes -prf
// const REFRESH_AFTER = STALE.HOURS.ONE
const CHECK_LATEST_AFTER = STALE.SECONDS.THIRTY

let Feed = ({
  feed,
  feedParams,
  ignoreFilterFor,
  style,
  enabled,
  pollInterval,
  disablePoll,
  scrollElRef,
  onScrolledDownChange,
  onHasNew,
  renderEmptyState,
  renderEndOfFeed,
  testID,
  headerOffset = 0,
  desktopFixedHeightOffset,
  ListHeaderComponent,
  extraData,
  savedFeedConfig,
}: {
  feed: FeedDescriptor
  feedParams?: FeedParams
  ignoreFilterFor?: string
  style?: StyleProp<ViewStyle>
  enabled?: boolean
  pollInterval?: number
  disablePoll?: boolean
  scrollElRef?: ListRef
  onHasNew?: (v: boolean) => void
  onScrolledDownChange?: (isScrolledDown: boolean) => void
  renderEmptyState: () => JSX.Element
  renderEndOfFeed?: () => JSX.Element
  testID?: string
  headerOffset?: number
  desktopFixedHeightOffset?: number
  ListHeaderComponent?: () => JSX.Element
  extraData?: any
  savedFeedConfig?: AppBskyActorDefs.SavedFeed
}): React.ReactNode => {
  const theme = useTheme()
  const {track} = useAnalytics()
  const {_} = useLingui()
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  const initialNumToRender = useInitialNumToRender()
  const feedFeedback = useFeedFeedbackContext()
  const [isPTRing, setIsPTRing] = React.useState(false)
  const checkForNewRef = React.useRef<(() => void) | null>(null)
  const lastFetchRef = React.useRef<number>(Date.now())
  const [feedType, feedUri] = feed.split('|')

  const opts = React.useMemo(
    () => ({enabled, ignoreFilterFor}),
    [enabled, ignoreFilterFor],
  )
  const {
    data,
    isFetching,
    isFetched,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePostFeedQuery(feed, feedParams, opts)
  if (data?.pages[0]) {
    lastFetchRef.current = data?.pages[0].fetchedAt
  }
  const isEmpty = React.useMemo(
    () => !isFetching && !data?.pages?.some(page => page.slices.length),
    [isFetching, data],
  )

  const checkForNew = React.useCallback(async () => {
    if (!data?.pages[0] || isFetching || !onHasNew || !enabled || disablePoll) {
      return
    }
    try {
      if (await pollLatest(data.pages[0])) {
        onHasNew(true)
      }
    } catch (e) {
      logger.error('Poll latest failed', {feed, message: String(e)})
    }
  }, [feed, data, isFetching, onHasNew, enabled, disablePoll])

  const myDid = currentAccount?.did || ''
  const onPostCreated = React.useCallback(() => {
    // NOTE
    // only invalidate if there's 1 page
    // more than 1 page can trigger some UI freakouts on iOS and android
    // -prf
    if (
      data?.pages.length === 1 &&
      (feed === 'following' ||
        feed === `author|${myDid}|posts_and_author_threads`)
    ) {
      queryClient.invalidateQueries({queryKey: RQKEY(feed)})
    }
  }, [queryClient, feed, data, myDid])
  React.useEffect(() => {
    return listenPostCreated(onPostCreated)
  }, [onPostCreated])

  React.useEffect(() => {
    // we store the interval handler in a ref to avoid needless
    // reassignments in other effects
    checkForNewRef.current = checkForNew
  }, [checkForNew])
  React.useEffect(() => {
    if (enabled) {
      const timeSinceFirstLoad = Date.now() - lastFetchRef.current
      // DISABLED need to check if this is causing random feed refreshes -prf
      /*if (timeSinceFirstLoad > REFRESH_AFTER) {
        // do a full refresh
        scrollElRef?.current?.scrollToOffset({offset: 0, animated: false})
        queryClient.resetQueries({queryKey: RQKEY(feed)})
      } else*/ if (
        timeSinceFirstLoad > CHECK_LATEST_AFTER &&
        checkForNewRef.current
      ) {
        // check for new on enable (aka on focus)
        checkForNewRef.current()
      }
    }
  }, [enabled, feed, queryClient, scrollElRef])
  React.useEffect(() => {
    let cleanup1: () => void | undefined, cleanup2: () => void | undefined
    const subscription = AppState.addEventListener('change', nextAppState => {
      // check for new on app foreground
      if (nextAppState === 'active') {
        checkForNewRef.current?.()
      }
    })
    cleanup1 = () => subscription.remove()
    if (pollInterval) {
      // check for new on interval
      const i = setInterval(() => checkForNewRef.current?.(), pollInterval)
      cleanup2 = () => clearInterval(i)
    }
    return () => {
      cleanup1?.()
      cleanup2?.()
    }
  }, [pollInterval])

  const feedItems = React.useMemo(() => {
    let arr: any[] = []
    if (KNOWN_SHUTDOWN_FEEDS.includes(feedUri)) {
      arr = arr.concat([FEED_SHUTDOWN_MSG_ITEM])
    }
    if (isFetched) {
      if (isError && isEmpty) {
        arr = arr.concat([ERROR_ITEM])
      } else if (isEmpty) {
        arr = arr.concat([EMPTY_FEED_ITEM])
      } else if (data) {
        for (const page of data?.pages) {
          arr = arr.concat(page.slices)
        }
      }
      if (isError && !isEmpty) {
        arr = arr.concat([LOAD_MORE_ERROR_ITEM])
      }
    } else {
      arr.push(LOADING_ITEM)
    }
    return arr
  }, [isFetched, isError, isEmpty, data, feedUri])

  // events
  // =

  const onRefresh = React.useCallback(async () => {
    track('Feed:onRefresh')
    logEvent('feed:refresh', {
      feedType: feedType,
      feedUrl: feed,
      reason: 'pull-to-refresh',
    })
    setIsPTRing(true)
    try {
      await refetch()
      onHasNew?.(false)
    } catch (err) {
      logger.error('Failed to refresh posts feed', {message: err})
    }
    setIsPTRing(false)
  }, [refetch, track, setIsPTRing, onHasNew, feed, feedType])

  const onEndReached = React.useCallback(async () => {
    if (isFetching || !hasNextPage || isError) return

    logEvent('feed:endReached', {
      feedType: feedType,
      feedUrl: feed,
      itemCount: feedItems.length,
    })
    track('Feed:onEndReached')
    try {
      await fetchNextPage()
    } catch (err) {
      logger.error('Failed to load more posts', {message: err})
    }
  }, [
    isFetching,
    hasNextPage,
    isError,
    fetchNextPage,
    track,
    feed,
    feedType,
    feedItems.length,
  ])

  const onPressTryAgain = React.useCallback(() => {
    refetch()
    onHasNew?.(false)
  }, [refetch, onHasNew])

  const onPressRetryLoadMore = React.useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  // rendering
  // =

  const renderItem = React.useCallback(
    ({item}: {item: any}) => {
      if (item === EMPTY_FEED_ITEM) {
        return renderEmptyState()
      } else if (item === ERROR_ITEM) {
        return (
          <FeedErrorMessage
            feedDesc={feed}
            error={error ?? undefined}
            onPressTryAgain={onPressTryAgain}
            savedFeedConfig={savedFeedConfig}
          />
        )
      } else if (item === LOAD_MORE_ERROR_ITEM) {
        return (
          <LoadMoreRetryBtn
            label={_(
              msg`There was an issue fetching posts. Tap here to try again.`,
            )}
            onPress={onPressRetryLoadMore}
          />
        )
      } else if (item === LOADING_ITEM) {
        return <PostFeedLoadingPlaceholder />
      } else if (item === FEED_SHUTDOWN_MSG_ITEM) {
        return <FeedShutdownMsg feedUri={feedUri} />
      } else if (item.rootUri === FALLBACK_MARKER_POST.post.uri) {
        // HACK
        // tell the user we fell back to discover
        // see home.ts (feed api) for more info
        // -prf
        return <DiscoverFallbackHeader />
      }
      return <FeedSlice slice={item} />
    },
    [
      feed,
      feedUri,
      error,
      onPressTryAgain,
      onPressRetryLoadMore,
      renderEmptyState,
      _,
      savedFeedConfig,
    ],
  )

  const shouldRenderEndOfFeed =
    !hasNextPage && !isEmpty && !isFetching && !isError && !!renderEndOfFeed
  const FeedFooter = React.useCallback(() => {
    /**
     * A bit of padding at the bottom of the feed as you scroll and when you
     * reach the end, so that content isn't cut off by the bottom of the
     * screen.
     */
    const offset = Math.max(headerOffset, 32) * (isWeb ? 1 : 2)

    return isFetchingNextPage ? (
      <View style={[styles.feedFooter]}>
        <ActivityIndicator />
        <View style={{height: offset}} />
      </View>
    ) : shouldRenderEndOfFeed ? (
      <View style={{minHeight: offset}}>{renderEndOfFeed()}</View>
    ) : (
      <View style={{height: offset}} />
    )
  }, [isFetchingNextPage, shouldRenderEndOfFeed, renderEndOfFeed, headerOffset])

  return (
    <View testID={testID} style={style}>
      <List
        testID={testID ? `${testID}-flatlist` : undefined}
        ref={scrollElRef}
        data={feedItems}
        keyExtractor={item => item._reactKey}
        renderItem={renderItem}
        ListFooterComponent={FeedFooter}
        ListHeaderComponent={ListHeaderComponent}
        refreshing={isPTRing}
        onRefresh={onRefresh}
        headerOffset={headerOffset}
        contentContainerStyle={{
          minHeight: Dimensions.get('window').height * 1.5,
        }}
        onScrolledDownChange={onScrolledDownChange}
        indicatorStyle={theme.colorScheme === 'dark' ? 'white' : 'black'}
        onEndReached={onEndReached}
        onEndReachedThreshold={2} // number of posts left to trigger load more
        removeClippedSubviews={true}
        extraData={extraData}
        // @ts-ignore our .web version only -prf
        desktopFixedHeight={
          desktopFixedHeightOffset ? desktopFixedHeightOffset : true
        }
        initialNumToRender={initialNumToRender}
        windowSize={11}
        onItemSeen={feedFeedback.onItemSeen}
      />
    </View>
  )
}
Feed = memo(Feed)
export {Feed}

const styles = StyleSheet.create({
  feedFooter: {paddingTop: 20},
})
