import React from 'react'
import {Image as RNImage} from 'react-native-image-crop-picker'
import {AppBskyActorDefs, AppBskyGraphDefs} from '@atproto/api'

import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {GalleryModel} from '#/state/models/media/gallery'
import {ImageModel} from '#/state/models/media/image'
import {ThreadgateSetting} from '../queries/threadgate'

export interface EditProfileModal {
  name: 'edit-profile'
  profile: AppBskyActorDefs.ProfileViewDetailed
  onUpdate?: () => void
}

export interface CreateOrEditListModal {
  name: 'create-or-edit-list'
  purpose?: string
  list?: AppBskyGraphDefs.ListView
  onSave?: (uri: string) => void
}

export interface UserAddRemoveListsModal {
  name: 'user-add-remove-lists'
  subject: string
  handle: string
  displayName: string
  onAdd?: (listUri: string) => void
  onRemove?: (listUri: string) => void
}

export interface ListAddRemoveUsersModal {
  name: 'list-add-remove-users'
  list: AppBskyGraphDefs.ListView
  onChange?: (
    type: 'add' | 'remove',
    profile: AppBskyActorDefs.ProfileViewBasic,
  ) => void
}

export interface EditImageModal {
  name: 'edit-image'
  image: ImageModel
  gallery: GalleryModel
}

export interface CropImageModal {
  name: 'crop-image'
  uri: string
  dimensions?: {width: number; height: number}
  onSelect: (img?: RNImage) => void
}

export interface AltTextImageModal {
  name: 'alt-text-image'
  image: ImageModel
}

export interface DeleteAccountModal {
  name: 'delete-account'
}

export interface RepostModal {
  name: 'repost'
  onRepost: () => void
  onQuote: () => void
  isReposted: boolean
}

export interface SelfLabelModal {
  name: 'self-label'
  labels: string[]
  hasMedia: boolean
  onChange: (labels: string[]) => void
}

export interface ThreadgateModal {
  name: 'threadgate'
  settings: ThreadgateSetting[]
  onChange: (settings: ThreadgateSetting[]) => void
}

export interface ChangeHandleModal {
  name: 'change-handle'
  onChanged: () => void
}

export interface WaitlistModal {
  name: 'waitlist'
}

export interface InviteCodesModal {
  name: 'invite-codes'
}

export interface AddAppPasswordModal {
  name: 'add-app-password'
}

export interface ContentLanguagesSettingsModal {
  name: 'content-languages-settings'
}

export interface PostLanguagesSettingsModal {
  name: 'post-languages-settings'
}

export interface VerifyEmailModal {
  name: 'verify-email'
  showReminder?: boolean
  onSuccess?: () => void
}

export interface ChangeEmailModal {
  name: 'change-email'
}

export interface ChangePasswordModal {
  name: 'change-password'
}

export interface LinkWarningModal {
  name: 'link-warning'
  text: string
  href: string
  share?: boolean
}

export interface InAppBrowserConsentModal {
  name: 'in-app-browser-consent'
  href: string
}

export type Modal =
  // Account
  | AddAppPasswordModal
  | ChangeHandleModal
  | DeleteAccountModal
  | EditProfileModal
  | VerifyEmailModal
  | ChangeEmailModal
  | ChangePasswordModal

  // Curation
  | ContentLanguagesSettingsModal
  | PostLanguagesSettingsModal

  // Lists
  | CreateOrEditListModal
  | UserAddRemoveListsModal
  | ListAddRemoveUsersModal

  // Posts
  | AltTextImageModal
  | CropImageModal
  | EditImageModal
  | RepostModal
  | SelfLabelModal
  | ThreadgateModal

  // Bluesky access
  | WaitlistModal
  | InviteCodesModal

  // Generic
  | LinkWarningModal
  | InAppBrowserConsentModal

const ModalContext = React.createContext<{
  isModalActive: boolean
  activeModals: Modal[]
}>({
  isModalActive: false,
  activeModals: [],
})

const ModalControlContext = React.createContext<{
  openModal: (modal: Modal) => void
  closeModal: () => boolean
  closeAllModals: () => void
}>({
  openModal: () => {},
  closeModal: () => false,
  closeAllModals: () => {},
})

/**
 * @deprecated DO NOT USE THIS unless you have no other choice.
 */
export let unstable__openModal: (modal: Modal) => void = () => {
  throw new Error(`ModalContext is not initialized`)
}

/**
 * @deprecated DO NOT USE THIS unless you have no other choice.
 */
export let unstable__closeModal: () => boolean = () => {
  throw new Error(`ModalContext is not initialized`)
}

export function Provider({children}: React.PropsWithChildren<{}>) {
  const [activeModals, setActiveModals] = React.useState<Modal[]>([])

  const openModal = useNonReactiveCallback((modal: Modal) => {
    setActiveModals(modals => [...modals, modal])
  })

  const closeModal = useNonReactiveCallback(() => {
    let wasActive = activeModals.length > 0
    setActiveModals(modals => {
      return modals.slice(0, -1)
    })
    return wasActive
  })

  const closeAllModals = useNonReactiveCallback(() => {
    setActiveModals([])
  })

  unstable__openModal = openModal
  unstable__closeModal = closeModal

  const state = React.useMemo(
    () => ({
      isModalActive: activeModals.length > 0,
      activeModals,
    }),
    [activeModals],
  )

  const methods = React.useMemo(
    () => ({
      openModal,
      closeModal,
      closeAllModals,
    }),
    [openModal, closeModal, closeAllModals],
  )

  return (
    <ModalContext.Provider value={state}>
      <ModalControlContext.Provider value={methods}>
        {children}
      </ModalControlContext.Provider>
    </ModalContext.Provider>
  )
}

export function useModals() {
  return React.useContext(ModalContext)
}

export function useModalControls() {
  return React.useContext(ModalControlContext)
}
