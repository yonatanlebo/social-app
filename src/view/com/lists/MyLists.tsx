import React from 'react'
import {
  ActivityIndicator,
  FlatList as RNFlatList,
  RefreshControl,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native'
import {AppBskyGraphDefs as GraphDefs} from '@atproto/api'
import {Trans} from '@lingui/macro'

import {cleanError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {MyListsFilter, useMyListsQuery} from '#/state/queries/my-lists'
import {useAnalytics} from 'lib/analytics/analytics'
import {usePalette} from 'lib/hooks/usePalette'
import {s} from 'lib/styles'
import {ErrorMessage} from '../util/error/ErrorMessage'
import {List} from '../util/List'
import {Text} from '../util/text/Text'
import {ListCard} from './ListCard'
import hairlineWidth = StyleSheet.hairlineWidth

const LOADING = {_reactKey: '__loading__'}
const EMPTY = {_reactKey: '__empty__'}
const ERROR_ITEM = {_reactKey: '__error__'}

export function MyLists({
  filter,
  inline,
  style,
  renderItem,
  testID,
}: {
  filter: MyListsFilter
  inline?: boolean
  style?: StyleProp<ViewStyle>
  renderItem?: (list: GraphDefs.ListView, index: number) => JSX.Element
  testID?: string
}) {
  const pal = usePalette('default')
  const {track} = useAnalytics()
  const [isPTRing, setIsPTRing] = React.useState(false)
  const {data, isFetching, isFetched, isError, error, refetch} =
    useMyListsQuery(filter)
  const isEmpty = !isFetching && !data?.length

  const items = React.useMemo(() => {
    let items: any[] = []
    if (isError && isEmpty) {
      items = items.concat([ERROR_ITEM])
    }
    if (!isFetched && isFetching) {
      items = items.concat([LOADING])
    } else if (isEmpty) {
      items = items.concat([EMPTY])
    } else {
      items = items.concat(data)
    }
    return items
  }, [isError, isEmpty, isFetched, isFetching, data])

  // events
  // =

  const onRefresh = React.useCallback(async () => {
    track('Lists:onRefresh')
    setIsPTRing(true)
    try {
      await refetch()
    } catch (err) {
      logger.error('Failed to refresh lists', {message: err})
    }
    setIsPTRing(false)
  }, [refetch, track, setIsPTRing])

  // rendering
  // =

  const renderItemInner = React.useCallback(
    ({item, index}: {item: any; index: number}) => {
      if (item === EMPTY) {
        return (
          <View
            key={item._reactKey}
            testID="listsEmpty"
            style={[{padding: 18, borderTopWidth: hairlineWidth}, pal.border]}>
            <Text style={pal.textLight}>
              <Trans>You have no lists.</Trans>
            </Text>
          </View>
        )
      } else if (item === ERROR_ITEM) {
        return (
          <ErrorMessage
            key={item._reactKey}
            message={cleanError(error)}
            onPressTryAgain={onRefresh}
          />
        )
      } else if (item === LOADING) {
        return (
          <View key={item._reactKey} style={{padding: 20}}>
            <ActivityIndicator />
          </View>
        )
      }
      return renderItem ? (
        renderItem(item, index)
      ) : (
        <ListCard
          key={item.uri}
          list={item}
          testID={`list-${item.name}`}
          style={styles.item}
        />
      )
    },
    [error, onRefresh, renderItem, pal],
  )

  if (inline) {
    return (
      <View testID={testID} style={style}>
        {items.length > 0 && (
          <RNFlatList
            testID={testID ? `${testID}-flatlist` : undefined}
            data={items}
            keyExtractor={item => (item.uri ? item.uri : item._reactKey)}
            renderItem={renderItemInner}
            refreshControl={
              <RefreshControl
                refreshing={isPTRing}
                onRefresh={onRefresh}
                tintColor={pal.colors.text}
                titleColor={pal.colors.text}
              />
            }
            contentContainerStyle={[s.contentContainer]}
            removeClippedSubviews={true}
            // @ts-ignore our .web version only -prf
            desktopFixedHeight
          />
        )}
      </View>
    )
  } else {
    return (
      <View testID={testID} style={style}>
        {items.length > 0 && (
          <List
            testID={testID ? `${testID}-flatlist` : undefined}
            data={items}
            keyExtractor={item => (item.uri ? item.uri : item._reactKey)}
            renderItem={renderItemInner}
            refreshing={isPTRing}
            onRefresh={onRefresh}
            contentContainerStyle={[s.contentContainer]}
            removeClippedSubviews={true}
            // @ts-ignore our .web version only -prf
            desktopFixedHeight
          />
        )}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
})
