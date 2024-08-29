import React from 'react'
import {
  InteractionManager,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'
import {Image} from 'expo-image'
import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyGraphDefs,
  moderateFeedGenerator,
  moderateUserList,
  ModerationDecision,
} from '@atproto/api'

import {ImagesLightbox, useLightboxControls} from '#/state/lightbox'
import {useLargeAltBadgeEnabled} from '#/state/preferences/large-alt-badge'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {usePalette} from 'lib/hooks/usePalette'
import {FeedSourceCard} from 'view/com/feeds/FeedSourceCard'
import {atoms as a, useTheme} from '#/alf'
import * as ListCard from '#/components/ListCard'
import {Embed as StarterPackCard} from '#/components/StarterPack/StarterPackCard'
import {ContentHider} from '../../../../components/moderation/ContentHider'
import {AutoSizedImage} from '../images/AutoSizedImage'
import {ImageLayoutGrid} from '../images/ImageLayoutGrid'
import {ExternalLinkEmbed} from './ExternalLinkEmbed'
import {MaybeQuoteEmbed} from './QuoteEmbed'
import {VideoEmbed} from './VideoEmbed'

type Embed =
  | AppBskyEmbedRecord.View
  | AppBskyEmbedImages.View
  | AppBskyEmbedVideo.View
  | AppBskyEmbedExternal.View
  | AppBskyEmbedRecordWithMedia.View
  | {$type: string; [k: string]: unknown}

export function PostEmbeds({
  embed,
  moderation,
  onOpen,
  style,
  allowNestedQuotes,
}: {
  embed?: Embed
  moderation?: ModerationDecision
  onOpen?: () => void
  style?: StyleProp<ViewStyle>
  allowNestedQuotes?: boolean
}) {
  const {openLightbox} = useLightboxControls()
  const largeAltBadge = useLargeAltBadgeEnabled()

  // quote post with media
  // =
  if (AppBskyEmbedRecordWithMedia.isView(embed)) {
    return (
      <View style={style}>
        <PostEmbeds
          embed={embed.media}
          moderation={moderation}
          onOpen={onOpen}
        />
        <MaybeQuoteEmbed embed={embed.record} onOpen={onOpen} />
      </View>
    )
  }

  if (AppBskyEmbedRecord.isView(embed)) {
    // custom feed embed (i.e. generator view)
    if (AppBskyFeedDefs.isGeneratorView(embed.record)) {
      return <MaybeFeedCard view={embed.record} />
    }

    // list embed
    if (AppBskyGraphDefs.isListView(embed.record)) {
      return <MaybeListCard view={embed.record} />
    }

    if (AppBskyGraphDefs.isStarterPackViewBasic(embed.record)) {
      return <StarterPackCard starterPack={embed.record} />
    }

    // quote post
    // =
    return (
      <MaybeQuoteEmbed
        embed={embed}
        style={style}
        onOpen={onOpen}
        allowNestedQuotes={allowNestedQuotes}
      />
    )
  }

  // image embed
  // =
  if (AppBskyEmbedImages.isView(embed)) {
    const {images} = embed

    if (images.length > 0) {
      const items = embed.images.map(img => ({
        uri: img.fullsize,
        alt: img.alt,
        aspectRatio: img.aspectRatio,
      }))
      const _openLightbox = (index: number) => {
        openLightbox(new ImagesLightbox(items, index))
      }
      const onPressIn = (_: number) => {
        InteractionManager.runAfterInteractions(() => {
          Image.prefetch(items.map(i => i.uri))
        })
      }

      if (images.length === 1) {
        const {alt, thumb, aspectRatio} = images[0]
        return (
          <ContentHider modui={moderation?.ui('contentMedia')}>
            <View style={[styles.container, style]}>
              <AutoSizedImage
                alt={alt}
                uri={thumb}
                dimensionsHint={aspectRatio}
                onPress={() => _openLightbox(0)}
                onPressIn={() => onPressIn(0)}
                style={a.rounded_sm}>
                {alt === '' ? null : (
                  <View style={styles.altContainer}>
                    <Text
                      style={[styles.alt, largeAltBadge && a.text_xs]}
                      accessible={false}>
                      ALT
                    </Text>
                  </View>
                )}
              </AutoSizedImage>
            </View>
          </ContentHider>
        )
      }

      return (
        <ContentHider modui={moderation?.ui('contentMedia')}>
          <View style={[styles.container, style]}>
            <ImageLayoutGrid
              images={embed.images}
              onPress={_openLightbox}
              onPressIn={onPressIn}
            />
          </View>
        </ContentHider>
      )
    }
  }

  // external link embed
  // =
  if (AppBskyEmbedExternal.isView(embed)) {
    const link = embed.external
    return (
      <ContentHider modui={moderation?.ui('contentMedia')}>
        <ExternalLinkEmbed
          link={link}
          onOpen={onOpen}
          style={[styles.container, style]}
        />
      </ContentHider>
    )
  }

  if (AppBskyEmbedVideo.isView(embed)) {
    return (
      <ContentHider modui={moderation?.ui('contentMedia')}>
        <VideoEmbed embed={embed} />
      </ContentHider>
    )
  }

  return <View />
}

function MaybeFeedCard({view}: {view: AppBskyFeedDefs.GeneratorView}) {
  const pal = usePalette('default')
  const moderationOpts = useModerationOpts()
  const moderation = React.useMemo(() => {
    return moderationOpts
      ? moderateFeedGenerator(view, moderationOpts)
      : undefined
  }, [view, moderationOpts])

  return (
    <ContentHider modui={moderation?.ui('contentList')}>
      <FeedSourceCard
        feedUri={view.uri}
        style={[pal.view, pal.border, styles.customFeedOuter]}
        showLikes
      />
    </ContentHider>
  )
}

function MaybeListCard({view}: {view: AppBskyGraphDefs.ListView}) {
  const moderationOpts = useModerationOpts()
  const moderation = React.useMemo(() => {
    return moderationOpts ? moderateUserList(view, moderationOpts) : undefined
  }, [view, moderationOpts])
  const t = useTheme()

  return (
    <ContentHider modui={moderation?.ui('contentList')}>
      <View
        style={[
          a.border,
          t.atoms.border_contrast_medium,
          a.p_md,
          a.rounded_sm,
          a.mt_sm,
        ]}>
        <ListCard.Default view={view} />
      </View>
    </ContentHider>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  altContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
    right: 6,
    bottom: 6,
  },
  alt: {
    color: 'white',
    fontSize: 7,
    fontWeight: 'bold',
  },
  customFeedOuter: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
})
