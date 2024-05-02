import React from 'react'
import {StyleProp, StyleSheet, TextStyle} from 'react-native'
import {TextLinkOnWebOnly} from './Link'
import {LoadingPlaceholder} from './LoadingPlaceholder'
import {TypographyVariant} from 'lib/ThemeContext'
import {sanitizeDisplayName} from 'lib/strings/display-names'
import {useFeedSourceInfoQuery} from '#/state/queries/feed'

export function FeedNameText({
  type = 'md',
  uri,
  href,
  lineHeight,
  numberOfLines,
  style,
}: {
  type?: TypographyVariant
  uri: string
  href: string
  lineHeight?: number
  numberOfLines?: number
  style?: StyleProp<TextStyle>
}) {
  const {data, isError} = useFeedSourceInfoQuery({uri})

  let inner
  if (data?.displayName || isError) {
    const displayName = data?.displayName || uri.split('/').pop() || ''
    inner = (
      <TextLinkOnWebOnly
        type={type}
        style={style}
        lineHeight={lineHeight}
        numberOfLines={numberOfLines}
        href={href}
        text={sanitizeDisplayName(displayName)}
      />
    )
  } else {
    inner = (
      <LoadingPlaceholder
        width={80}
        height={8}
        style={styles.loadingPlaceholder}
      />
    )
  }

  return inner
}

const styles = StyleSheet.create({
  loadingPlaceholder: {position: 'relative', top: 1, Right: 2},
})
