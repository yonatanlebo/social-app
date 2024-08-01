import React, {useCallback, useMemo, useState} from 'react'
import {AppBskyActorDefs as ActorDefs} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {cleanError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {usePostRepostedByQuery} from '#/state/queries/post-reposted-by'
import {useResolveUriQuery} from '#/state/queries/resolve-uri'
import {useInitialNumToRender} from 'lib/hooks/useInitialNumToRender'
import {
  ListFooter,
  ListHeaderDesktop,
  ListMaybePlaceholder,
} from '#/components/Lists'
import {ProfileCardWithFollowBtn} from '../profile/ProfileCard'
import {List} from '../util/List'

function renderItem({item}: {item: ActorDefs.ProfileViewBasic}) {
  return <ProfileCardWithFollowBtn key={item.did} profile={item} />
}

function keyExtractor(item: ActorDefs.ProfileViewBasic) {
  return item.did
}

export function PostRepostedBy({uri}: {uri: string}) {
  const {_} = useLingui()
  const initialNumToRender = useInitialNumToRender()

  const [isPTRing, setIsPTRing] = useState(false)

  const {
    data: resolvedUri,
    error: resolveError,
    isLoading: isLoadingUri,
  } = useResolveUriQuery(uri)
  const {
    data,
    isLoading: isLoadingRepostedBy,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = usePostRepostedByQuery(resolvedUri?.uri)

  const isError = Boolean(resolveError || error)

  const repostedBy = useMemo(() => {
    if (data?.pages) {
      return data.pages.flatMap(page => page.repostedBy)
    }
    return []
  }, [data])

  const onRefresh = useCallback(async () => {
    setIsPTRing(true)
    try {
      await refetch()
    } catch (err) {
      logger.error('Failed to refresh reposts', {message: err})
    }
    setIsPTRing(false)
  }, [refetch, setIsPTRing])

  const onEndReached = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage || isError) return
    try {
      await fetchNextPage()
    } catch (err) {
      logger.error('Failed to load more reposts', {message: err})
    }
  }, [isFetchingNextPage, hasNextPage, isError, fetchNextPage])

  if (repostedBy.length < 1) {
    return (
      <ListMaybePlaceholder
        isLoading={isLoadingUri || isLoadingRepostedBy}
        isError={isError}
      />
    )
  }

  // loaded
  // =
  return (
    <List
      data={repostedBy}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      refreshing={isPTRing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={4}
      ListHeaderComponent={<ListHeaderDesktop title={_(msg`Reposted By`)} />}
      ListFooterComponent={
        <ListFooter
          isFetchingNextPage={isFetchingNextPage}
          error={cleanError(error)}
          onRetry={fetchNextPage}
        />
      }
      // @ts-ignore our .web version only -prf
      desktopFixedHeight
      initialNumToRender={initialNumToRender}
      windowSize={11}
    />
  )
}
