import React from 'react'
import {Keyboard, StyleProp, ViewStyle} from 'react-native'
import Animated, {AnimatedStyle} from 'react-native-reanimated'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {isNative} from '#/platform/detection'
import {useModalControls} from '#/state/modals'
import {ThreadgateSetting} from '#/state/queries/threadgate'
import {useAnalytics} from 'lib/analytics/analytics'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {CircleBanSign_Stroke2_Corner0_Rounded as CircleBanSign} from '#/components/icons/CircleBanSign'
import {Earth_Stroke2_Corner0_Rounded as Earth} from '#/components/icons/Globe'
import {Group3_Stroke2_Corner0_Rounded as Group} from '#/components/icons/Group'

export function ThreadgateBtn({
  threadgate,
  onChange,
  style,
}: {
  threadgate: ThreadgateSetting[]
  onChange: (v: ThreadgateSetting[]) => void
  style?: StyleProp<AnimatedStyle<ViewStyle>>
}) {
  const {track} = useAnalytics()
  const {_} = useLingui()
  const t = useTheme()
  const {openModal} = useModalControls()

  const onPress = () => {
    track('Composer:ThreadgateOpened')
    if (isNative && Keyboard.isVisible()) {
      Keyboard.dismiss()
    }
    openModal({
      name: 'threadgate',
      settings: threadgate,
      onChange,
    })
  }

  const isEverybody = threadgate.length === 0
  const isNobody = !!threadgate.find(gate => gate.type === 'nobody')
  const label = isEverybody
    ? _(msg`Everybody can reply`)
    : isNobody
    ? _(msg`Nobody can reply`)
    : _(msg`Some people can reply`)

  return (
    <Animated.View style={[a.flex_row, a.p_sm, t.atoms.bg, style]}>
      <Button
        variant="solid"
        color="secondary"
        size="xsmall"
        testID="openReplyGateButton"
        onPress={onPress}
        label={label}>
        <ButtonIcon
          icon={isEverybody ? Earth : isNobody ? CircleBanSign : Group}
        />
        <ButtonText>{label}</ButtonText>
      </Button>
    </Animated.View>
  )
}
