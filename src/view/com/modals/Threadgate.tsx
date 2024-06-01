import React, {useState} from 'react'
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import isEqual from 'lodash.isequal'

import {useModalControls} from '#/state/modals'
import {useMyListsQuery} from '#/state/queries/my-lists'
import {ThreadgateSetting} from '#/state/queries/threadgate'
import {usePalette} from 'lib/hooks/usePalette'
import {colors, s} from 'lib/styles'
import {isWeb} from 'platform/detection'
import {ScrollView} from 'view/com/modals/util'
import {Text} from '../util/text/Text'

export const snapPoints = ['60%']

export function Component({
  settings,
  onChange,
}: {
  settings: ThreadgateSetting[]
  onChange: (settings: ThreadgateSetting[]) => void
}) {
  const pal = usePalette('default')
  const {closeModal} = useModalControls()
  const [selected, setSelected] = useState(settings)
  const {_} = useLingui()
  const {data: lists} = useMyListsQuery('curate')

  const onPressEverybody = () => {
    setSelected([])
    onChange([])
  }

  const onPressNobody = () => {
    setSelected([{type: 'nobody'}])
    onChange([{type: 'nobody'}])
  }

  const onPressAudience = (setting: ThreadgateSetting) => {
    // remove nobody
    let newSelected = selected.filter(v => v.type !== 'nobody')
    // toggle
    const i = newSelected.findIndex(v => isEqual(v, setting))
    if (i === -1) {
      newSelected.push(setting)
    } else {
      newSelected.splice(i, 1)
    }
    setSelected(newSelected)
    onChange(newSelected)
  }

  return (
    <View testID="threadgateModal" style={[pal.view, styles.container]}>
      <View style={styles.titleSection}>
        <Text type="title-lg" style={[pal.text, styles.title]}>
          <Trans>Who can reply</Trans>
        </Text>
      </View>

      <ScrollView>
        <Text style={[pal.text, styles.description]}>
          <Trans>Choose "Everybody" or "Nobody"</Trans>
        </Text>
        <View style={{flexDirection: 'row', gap: 6, paddingHorizontal: 6}}>
          <Selectable
            label={_(msg`Everybody`)}
            isSelected={selected.length === 0}
            onPress={onPressEverybody}
            style={{flex: 1}}
          />
          <Selectable
            label={_(msg`Nobody`)}
            isSelected={!!selected.find(v => v.type === 'nobody')}
            onPress={onPressNobody}
            style={{flex: 1}}
          />
        </View>
        <Text style={[pal.text, styles.description]}>
          <Trans>Or combine these options:</Trans>
        </Text>
        <View style={{flexDirection: 'column', gap: 4, paddingHorizontal: 6}}>
          <Selectable
            label={_(msg`Mentioned users`)}
            isSelected={!!selected.find(v => v.type === 'mention')}
            onPress={() => onPressAudience({type: 'mention'})}
          />
          <Selectable
            label={_(msg`Followed users`)}
            isSelected={!!selected.find(v => v.type === 'following')}
            onPress={() => onPressAudience({type: 'following'})}
          />
          {lists?.length
            ? lists.map(list => (
                <Selectable
                  key={list.uri}
                  label={_(msg`Users in "${list.name}"`)}
                  isSelected={
                    !!selected.find(
                      v => v.type === 'list' && v.list === list.uri,
                    )
                  }
                  onPress={() =>
                    onPressAudience({type: 'list', list: list.uri})
                  }
                />
              ))
            : null}
        </View>
      </ScrollView>

      <View style={[styles.btnContainer, pal.borderDark]}>
        <TouchableOpacity
          testID="confirmBtn"
          onPress={() => {
            closeModal()
          }}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={_(msg({message: `Done`, context: 'action'}))}
          accessibilityHint="">
          <Text style={[s.white, s.bold, s.f18]}>
            <Trans context="action">Done</Trans>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function Selectable({
  label,
  isSelected,
  onPress,
  style,
}: {
  label: string
  isSelected: boolean
  onPress: () => void
  style?: StyleProp<ViewStyle>
}) {
  const pal = usePalette(isSelected ? 'inverted' : 'default')
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint=""
      style={[styles.selectable, pal.border, pal.view, style]}>
      <Text type="lg" style={[pal.text]}>
        {label}
      </Text>
      {isSelected ? (
        <FontAwesomeIcon icon="check" color={pal.colors.text} size={18} />
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: isWeb ? 0 : 40,
  },
  titleSection: {
    paddingTop: isWeb ? 0 : 4,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
  },
  description: {
    textAlign: 'center',
    paddingVertical: 16,
  },
  selectable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    padding: 14,
    backgroundColor: colors.blue3,
  },
  btnContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
})
