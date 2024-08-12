import React, {useCallback, useEffect, useRef, useState} from 'react'
import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {
  HLSUnsupportedError,
  VideoEmbedInnerWeb,
} from 'view/com/util/post-embeds/VideoEmbedInner/VideoEmbedInnerWeb'
import {atoms as a, useTheme} from '#/alf'
import {ErrorBoundary} from '../ErrorBoundary'
import {useActiveVideoView} from './ActiveVideoContext'
import * as VideoFallback from './VideoEmbedInner/VideoFallback'

export function VideoEmbed({source}: {source: string}) {
  const t = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const {active, setActive, sendPosition, currentActiveView} =
    useActiveVideoView({source})
  const [onScreen, setOnScreen] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (!entry) return
        setOnScreen(entry.isIntersecting)
        sendPosition(
          entry.boundingClientRect.y + entry.boundingClientRect.height / 2,
        )
      },
      {threshold: 0.5},
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [sendPosition])

  const [key, setKey] = useState(0)
  const renderError = useCallback(
    (error: unknown) => (
      <VideoError error={error} retry={() => setKey(key + 1)} />
    ),
    [key],
  )

  return (
    <View
      style={[
        a.w_full,
        {aspectRatio: 16 / 9},
        t.atoms.bg_contrast_25,
        a.rounded_sm,
        a.my_xs,
      ]}>
      <div
        ref={ref}
        style={{display: 'flex', flex: 1, cursor: 'default'}}
        onClick={evt => evt.stopPropagation()}>
        <ErrorBoundary renderError={renderError} key={key}>
          <ViewportObserver
            sendPosition={sendPosition}
            isAnyViewActive={currentActiveView !== null}>
            <VideoEmbedInnerWeb
              source={source}
              active={active}
              setActive={setActive}
              onScreen={onScreen}
            />
          </ViewportObserver>
        </ErrorBoundary>
      </div>
    </View>
  )
}

/**
 * Renders a 100vh tall div and watches it with an IntersectionObserver to
 * send the position of the div when it's near the screen.
 */
function ViewportObserver({
  children,
  sendPosition,
  isAnyViewActive,
}: {
  children: React.ReactNode
  sendPosition: (position: number) => void
  isAnyViewActive?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [nearScreen, setNearScreen] = useState(false)

  // Send position when scrolling. This is done with an IntersectionObserver
  // observing a div of 100vh height
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (!entry) return
        const position =
          entry.boundingClientRect.y + entry.boundingClientRect.height / 2
        sendPosition(position)
        setNearScreen(entry.isIntersecting)
      },
      {threshold: Array.from({length: 101}, (_, i) => i / 100)},
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [sendPosition])

  // In case scrolling hasn't started yet, send up the position
  useEffect(() => {
    if (ref.current && !isAnyViewActive) {
      const rect = ref.current.getBoundingClientRect()
      const position = rect.y + rect.height / 2
      sendPosition(position)
    }
  }, [isAnyViewActive, sendPosition])

  return (
    <View style={[a.flex_1, a.flex_row]}>
      {nearScreen && children}
      <div
        ref={ref}
        style={{
          position: 'absolute',
          top: 'calc(50% - 50vh)',
          left: '50%',
          height: '100vh',
          width: 1,
          pointerEvents: 'none',
        }}
      />
    </View>
  )
}

function VideoError({error, retry}: {error: unknown; retry: () => void}) {
  const isHLS = error instanceof HLSUnsupportedError

  return (
    <VideoFallback.Container>
      <VideoFallback.Text>
        {isHLS ? (
          <Trans>
            Your browser does not support the video format. Please try a
            different browser.
          </Trans>
        ) : (
          <Trans>
            An error occurred while loading the video. Please try again later.
          </Trans>
        )}
      </VideoFallback.Text>
      {!isHLS && <VideoFallback.RetryButton onPress={retry} />}
    </VideoFallback.Container>
  )
}
