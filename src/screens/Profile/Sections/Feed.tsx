import React from 'react'
import {findNodeHandle, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {isNative} from '#/platform/detection'
import {FeedDescriptor} from '#/state/queries/post-feed'
import {RQKEY as FEED_RQKEY} from '#/state/queries/post-feed'
import {truncateAndInvalidate} from '#/state/queries/util'
import {usePalette} from 'lib/hooks/usePalette'
import {Text} from '#/view/com/util/text/Text'
import {Feed} from 'view/com/posts/Feed'
import {EmptyState} from 'view/com/util/EmptyState'
import {ListRef} from 'view/com/util/List'
import {LoadLatestBtn} from 'view/com/util/load-latest/LoadLatestBtn'
import {SectionRef} from './types'

interface FeedSectionProps {
  feed: FeedDescriptor
  headerHeight: number
  isFocused: boolean
  scrollElRef: ListRef
  ignoreFilterFor?: string
  setScrollViewTag: (tag: number | null) => void
}
export const ProfileFeedSection = React.forwardRef<
  SectionRef,
  FeedSectionProps
>(function FeedSectionImpl(
  {
    feed,
    headerHeight,
    isFocused,
    scrollElRef,
    ignoreFilterFor,
    setScrollViewTag,
  },
  ref,
) {
  const {_} = useLingui()
  const queryClient = useQueryClient()
  const [hasNew, setHasNew] = React.useState(false)
  const [isScrolledDown, setIsScrolledDown] = React.useState(false)

  const onScrollToTop = React.useCallback(() => {
    scrollElRef.current?.scrollToOffset({
      animated: isNative,
      offset: -headerHeight,
    })
    truncateAndInvalidate(queryClient, FEED_RQKEY(feed))
    setHasNew(false)
  }, [scrollElRef, headerHeight, queryClient, feed, setHasNew])
  React.useImperativeHandle(ref, () => ({
    scrollToTop: onScrollToTop,
  }))

  const renderPostsEmpty = React.useCallback(() => {
    return <EmptyState icon="feed" message={_(msg`This feed is empty!`)} />
  }, [_])

  React.useEffect(() => {
    if (isFocused && scrollElRef.current) {
      const nativeTag = findNodeHandle(scrollElRef.current)
      setScrollViewTag(nativeTag)
    }
  }, [isFocused, scrollElRef, setScrollViewTag])

  return (
    <View>
      <Feed
        testID="postsFeed"
        enabled={isFocused}
        feed={feed}
        scrollElRef={scrollElRef}
        onHasNew={setHasNew}
        onScrolledDownChange={setIsScrolledDown}
        renderEmptyState={renderPostsEmpty}
        headerOffset={headerHeight}
        renderEndOfFeed={ProfileEndOfFeed}
        ignoreFilterFor={ignoreFilterFor}
      />
      {(isScrolledDown || hasNew) && (
        <LoadLatestBtn
          onPress={onScrollToTop}
          label={_(msg`Load new posts`)}
          showIndicator={hasNew}
        />
      )}
    </View>
  )
})

function ProfileEndOfFeed() {
  const pal = usePalette('default')

  return (
    <View
      style={[
        pal.border,
        {paddingTop: 32, paddingBottom: 32, borderTopWidth: 1},
      ]}>
      <Text style={[pal.textLight, pal.border, {textAlign: 'center'}]}>
        <Trans>End of feed</Trans>
      </Text>
    </View>
  )
}
