import * as React from 'react'
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import Animated, {
  AnimatedRef,
  runOnJS,
  runOnUI,
  scrollTo,
  SharedValue,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'

import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {ScrollProvider} from '#/lib/ScrollContext'
import {isIOS} from 'platform/detection'
import {Pager, PagerRef, RenderTabBarFnProps} from 'view/com/pager/Pager'
import {ListMethods} from '../util/List'
import {TabBar} from './TabBar'

export interface PagerWithHeaderChildParams {
  headerHeight: number
  isFocused: boolean
  scrollElRef: React.MutableRefObject<ListMethods | ScrollView | null>
}

export interface PagerWithHeaderProps {
  testID?: string
  children:
    | (((props: PagerWithHeaderChildParams) => JSX.Element) | null)[]
    | ((props: PagerWithHeaderChildParams) => JSX.Element)
  items: string[]
  isHeaderReady: boolean
  renderHeader?: () => JSX.Element
  initialPage?: number
  onPageSelected?: (index: number) => void
  onCurrentPageSelected?: (index: number) => void
}
export const PagerWithHeader = React.forwardRef<PagerRef, PagerWithHeaderProps>(
  function PageWithHeaderImpl(
    {
      children,
      testID,
      items,
      isHeaderReady,
      renderHeader,
      initialPage,
      onPageSelected,
      onCurrentPageSelected,
    }: PagerWithHeaderProps,
    ref,
  ) {
    const [currentPage, setCurrentPage] = React.useState(0)
    const [tabBarHeight, setTabBarHeight] = React.useState(0)
    const [headerOnlyHeight, setHeaderOnlyHeight] = React.useState(0)
    const scrollY = useSharedValue(0)
    const headerHeight = headerOnlyHeight + tabBarHeight

    // capture the header bar sizing
    const onTabBarLayout = useNonReactiveCallback((evt: LayoutChangeEvent) => {
      const height = evt.nativeEvent.layout.height
      if (height > 0) {
        // The rounding is necessary to prevent jumps on iOS
        setTabBarHeight(Math.round(height))
      }
    })
    const onHeaderOnlyLayout = useNonReactiveCallback((height: number) => {
      if (height > 0) {
        // The rounding is necessary to prevent jumps on iOS
        setHeaderOnlyHeight(Math.round(height))
      }
    })

    const renderTabBar = React.useCallback(
      (props: RenderTabBarFnProps) => {
        return (
          <PagerTabBar
            headerOnlyHeight={headerOnlyHeight}
            items={items}
            isHeaderReady={isHeaderReady}
            renderHeader={renderHeader}
            currentPage={currentPage}
            onCurrentPageSelected={onCurrentPageSelected}
            onTabBarLayout={onTabBarLayout}
            onHeaderOnlyLayout={onHeaderOnlyLayout}
            onSelect={props.onSelect}
            scrollY={scrollY}
            testID={testID}
          />
        )
      },
      [
        headerOnlyHeight,
        items,
        isHeaderReady,
        renderHeader,
        currentPage,
        onCurrentPageSelected,
        onTabBarLayout,
        onHeaderOnlyLayout,
        scrollY,
        testID,
      ],
    )

    const scrollRefs = useSharedValue<AnimatedRef<any>[]>([])
    const registerRef = React.useCallback(
      (scrollRef: AnimatedRef<any> | null, atIndex: number) => {
        scrollRefs.modify(refs => {
          'worklet'
          refs[atIndex] = scrollRef
          return refs
        })
      },
      [scrollRefs],
    )

    const lastForcedScrollY = useSharedValue(0)
    const adjustScrollForOtherPages = () => {
      'worklet'
      const currentScrollY = scrollY.value
      const forcedScrollY = Math.min(currentScrollY, headerOnlyHeight)
      if (lastForcedScrollY.value !== forcedScrollY) {
        lastForcedScrollY.value = forcedScrollY
        const refs = scrollRefs.value
        for (let i = 0; i < refs.length; i++) {
          if (i !== currentPage && refs[i] != null) {
            scrollTo(refs[i], 0, forcedScrollY, false)
          }
        }
      }
    }

    const throttleTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
      null,
    )
    const queueThrottledOnScroll = useNonReactiveCallback(() => {
      if (!throttleTimeout.current) {
        throttleTimeout.current = setTimeout(() => {
          throttleTimeout.current = null
          runOnUI(adjustScrollForOtherPages)()
        }, 80 /* Sync often enough you're unlikely to catch it unsynced */)
      }
    })

    const onScrollWorklet = React.useCallback(
      (e: NativeScrollEvent) => {
        'worklet'
        const nextScrollY = e.contentOffset.y
        scrollY.value = nextScrollY
        runOnJS(queueThrottledOnScroll)()
      },
      [scrollY, queueThrottledOnScroll],
    )

    const onPageSelectedInner = React.useCallback(
      (index: number) => {
        setCurrentPage(index)
        onPageSelected?.(index)
      },
      [onPageSelected, setCurrentPage],
    )

    const onPageSelecting = React.useCallback((index: number) => {
      setCurrentPage(index)
    }, [])

    return (
      <Pager
        ref={ref}
        testID={testID}
        initialPage={initialPage}
        onPageSelected={onPageSelectedInner}
        onPageSelecting={onPageSelecting}
        renderTabBar={renderTabBar}>
        {toArray(children)
          .filter(Boolean)
          .map((child, i) => {
            const isReady =
              isHeaderReady && headerOnlyHeight > 0 && tabBarHeight > 0
            return (
              <View key={i} collapsable={false}>
                <PagerItem
                  headerHeight={headerHeight}
                  index={i}
                  isReady={isReady}
                  isFocused={i === currentPage}
                  onScrollWorklet={i === currentPage ? onScrollWorklet : noop}
                  registerRef={registerRef}
                  renderTab={child}
                />
              </View>
            )
          })}
      </Pager>
    )
  },
)

let PagerTabBar = ({
  currentPage,
  headerOnlyHeight,
  isHeaderReady,
  items,
  scrollY,
  testID,
  renderHeader,
  onHeaderOnlyLayout,
  onTabBarLayout,
  onCurrentPageSelected,
  onSelect,
}: {
  currentPage: number
  headerOnlyHeight: number
  isHeaderReady: boolean
  items: string[]
  testID?: string
  scrollY: SharedValue<number>
  renderHeader?: () => JSX.Element
  onHeaderOnlyLayout: (height: number) => void
  onTabBarLayout: (e: LayoutChangeEvent) => void
  onCurrentPageSelected?: (index: number) => void
  onSelect?: (index: number) => void
}): React.ReactNode => {
  const headerTransform = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: Math.min(Math.min(scrollY.value, headerOnlyHeight) * -1, 0),
      },
    ],
  }))
  const headerRef = React.useRef(null)
  return (
    <Animated.View
      pointerEvents={isIOS ? 'auto' : 'box-none'}
      style={[styles.tabBarMobile, headerTransform]}>
      <View
        ref={headerRef}
        pointerEvents={isIOS ? 'auto' : 'box-none'}
        collapsable={false}>
        {renderHeader?.()}
        {
          // It wouldn't be enough to place `onLayout` on the parent node because
          // this would risk measuring before `isHeaderReady` has turned `true`.
          // Instead, we'll render a brand node conditionally and get fresh layout.
          isHeaderReady && (
            <View
              // It wouldn't be enough to do this in a `ref` of an effect because,
              // even if `isHeaderReady` might have turned `true`, the associated
              // layout might not have been performed yet on the native side.
              onLayout={() => {
                // @ts-ignore
                headerRef.current?.measure(
                  (_x: number, _y: number, _width: number, height: number) => {
                    onHeaderOnlyLayout(height)
                  },
                )
              }}
            />
          )
        }
      </View>
      <View
        onLayout={onTabBarLayout}
        style={{
          // Render it immediately to measure it early since its size doesn't depend on the content.
          // However, keep it invisible until the header above stabilizes in order to prevent jumps.
          opacity: isHeaderReady ? 1 : 0,
          pointerEvents: isHeaderReady ? 'auto' : 'none',
        }}>
        <TabBar
          testID={testID}
          items={items}
          selectedPage={currentPage}
          onSelect={onSelect}
          onPressSelected={onCurrentPageSelected}
        />
      </View>
    </Animated.View>
  )
}
PagerTabBar = React.memo(PagerTabBar)

function PagerItem({
  headerHeight,
  index,
  isReady,
  isFocused,
  onScrollWorklet,
  renderTab,
  registerRef,
}: {
  headerHeight: number
  index: number
  isFocused: boolean
  isReady: boolean
  registerRef: (scrollRef: AnimatedRef<any> | null, atIndex: number) => void
  onScrollWorklet: (e: NativeScrollEvent) => void
  renderTab: ((props: PagerWithHeaderChildParams) => JSX.Element) | null
}) {
  const scrollElRef = useAnimatedRef()

  React.useEffect(() => {
    registerRef(scrollElRef, index)
    return () => {
      registerRef(null, index)
    }
  }, [scrollElRef, registerRef, index])

  if (!isReady || renderTab == null) {
    return null
  }

  return (
    <ScrollProvider onScroll={onScrollWorklet}>
      {renderTab({
        headerHeight,
        isFocused,
        scrollElRef: scrollElRef as React.MutableRefObject<
          ListMethods | ScrollView | null
        >,
      })}
    </ScrollProvider>
  )
}

const styles = StyleSheet.create({
  tabBarMobile: {
    position: 'absolute',
    zIndex: 1,
    top: 0,
    left: 0,
    width: '100%',
  },
})

function noop() {
  'worklet'
}

function toArray<T>(v: T | T[]): T[] {
  if (Array.isArray(v)) {
    return v
  }
  return [v]
}
