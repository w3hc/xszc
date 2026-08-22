'use client'

import {
  Box,
  Flex,
  Text,
  useDisclosure,
  VStack,
  Link as ChakraLink,
  CloseButton,
} from '@chakra-ui/react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { MenuRoot, MenuTrigger, MenuPositioner, MenuContent, MenuItem } from '@/components/ui/menu'
import { Dialog, Portal } from '@/components/ui/dialog'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HiMenu } from 'react-icons/hi'
import Spinner from './Spinner'
import { useTranslation } from '@/hooks/useTranslation'
import { useW3PK, isNoPasskeyError } from '@/context/W3PK'
import { useState } from 'react'
import { toaster } from '@/components/ui/toaster'
import { brandColors } from '@/theme'

interface HeaderProps {
  addedPixelsCount?: number
  onReset?: () => void
  cooldownSeconds?: number
}

export default function Header({
  addedPixelsCount = 0,
  onReset,
  cooldownSeconds = 0,
}: HeaderProps) {
  const { isAuthenticated, login, register, logout, hasLocalCredentials } = useW3PK()
  const t = useTranslation()
  const pathname = usePathname()
  const { open: isOpen, onOpen, onClose } = useDisclosure()
  const [username, setUsername] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isUsernameInvalid, setIsUsernameInvalid] = useState(false)

  // Format countdown as HH:MM:SS
  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return ''
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const validateUsername = (input: string): boolean => {
    if (!input.trim()) {
      return true
    }

    const trimmedInput = input.trim()

    // Check overall format and length (3-50 chars)
    // Alphanumeric, underscore, and hyphen allowed
    // Must start and end with alphanumeric
    const formatValid =
      /^[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?$/.test(trimmedInput) &&
      trimmedInput.length >= 3 &&
      trimmedInput.length <= 50

    return formatValid
  }

  const handleLogin = async () => {
    /**
     * Login Workflow:
     * 1. Existing persistent sessions are restored by the W3PK context on mount
     * 2. If no passkey was ever registered on this device, open the
     *    registration modal directly — calling login() with no local
     *    credential would make the browser show its cross-device
     *    "scan this QR code" dialog instead of failing
     * 3. Otherwise login() prompts for the passkey; if it turns out to be
     *    unavailable after all, fall back to the registration modal
     */
    try {
      if (!(await hasLocalCredentials())) {
        onOpen()
        return
      }
      await login()
    } catch (error) {
      if (isNoPasskeyError(error)) {
        toaster.create({
          title: t.header.noAccountFoundTitle,
          description: t.header.noAccountFoundDescription,
          type: 'info',
          duration: 4000,
        })
        onOpen()
      }
      // Other errors (user cancelled, timeout, etc.) are already handled
      // by the login() function in the W3PK context
    }
  }

  const handleRegister = async () => {
    if (!username.trim()) {
      toaster.create({
        title: t.header.usernameRequiredTitle,
        description: t.header.usernameRequiredDescription,
        type: 'warning',
        duration: 3000,
      })
      setIsUsernameInvalid(true)
      return
    }

    const isValid = validateUsername(username)
    if (!isValid) {
      setIsUsernameInvalid(true)
      return
    }

    setIsUsernameInvalid(false)

    try {
      setIsRegistering(true)
      // register() handles its own timeout and error/success toasts
      await register(username.trim())
      setUsername('')
      onClose()
    } catch (error) {
      console.error('[Header] Registration failed:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    if (validateUsername(value)) {
      setIsUsernameInvalid(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const handleModalClose = () => {
    setUsername('')
    setIsUsernameInvalid(false)
    onClose()
  }

  return (
    <>
      <Box
        as="header"
        py={4}
        px={4}
        position="fixed"
        top={0}
        right={0}
        zIndex={1000}
        overflow="visible"
        pointerEvents="auto"
        bg="rgba(0, 0, 0, 0.8)"
        backdropFilter="blur(10px)"
        style={{ cursor: 'default' }}
      >
        <Flex gap={2} align="center" overflow="visible" style={{ cursor: 'default' }}>
          <Box>
            <Text
              fontSize="sm"
              color="gray.300"
              cursor={addedPixelsCount >= 2 ? 'pointer' : 'default'}
              onClick={addedPixelsCount >= 2 ? onReset : undefined}
              _hover={addedPixelsCount >= 2 ? { color: 'white' } : undefined}
            >
              {addedPixelsCount === 0 && ''}
              {addedPixelsCount === 1 && cooldownSeconds > 0 && formatCountdown(cooldownSeconds)}
              {addedPixelsCount === 1 && cooldownSeconds <= 0 && 'Set pixel'}
              {addedPixelsCount >= 2 && 'Reset'}
            </Text>
          </Box>

          <MenuRoot>
            <MenuTrigger asChild>
              <IconButton aria-label={t.header.optionsAriaLabel} variant="ghost" size="sm">
                <HiMenu />
              </IconButton>
            </MenuTrigger>
            <Portal>
              <MenuPositioner>
                <MenuContent minWidth="auto">
                  {pathname !== '/' && (
                    <Link href="/" color="white" prefetch={true}>
                      <MenuItem value="home" fontSize="md" px={4} py={3}>
                        Home
                      </MenuItem>
                    </Link>
                  )}
                  {!isAuthenticated && (
                    <MenuItem value="login" fontSize="md" px={4} py={3} onClick={handleLogin}>
                      {t.common.login}
                    </MenuItem>
                  )}
                  <Link href="/rules" color="white" prefetch={true}>
                    <MenuItem value="rules" fontSize="md" px={4} py={3}>
                      Rules
                    </MenuItem>
                  </Link>
                  <Link href="/stats" color="white" prefetch={true}>
                    <MenuItem value="stats" fontSize="md" px={4} py={3}>
                      Stats
                    </MenuItem>
                  </Link>
                  {/* <Link href="/dao" color="white" prefetch={true}>
                    <MenuItem value="dao" fontSize="md" px={4} py={3}>
                      DAO
                    </MenuItem>
                  </Link> */}
                  <Link href="/settings" color="white" prefetch={true}>
                    <MenuItem value="settings" fontSize="md" px={4} py={3}>
                      {t.navigation.settings}
                    </MenuItem>
                  </Link>
                  {isAuthenticated && (
                    <MenuItem value="logout" fontSize="md" px={4} py={3} onClick={handleLogout}>
                      {t.common.logout}
                    </MenuItem>
                  )}
                </MenuContent>
              </MenuPositioner>
            </Portal>
          </MenuRoot>
          {/* <LanguageSelector /> */}
        </Flex>
      </Box>

      {/* Registration Modal */}
      <Dialog.Root
        open={isOpen}
        onOpenChange={(e: { open: boolean }) => (e.open ? null : handleModalClose())}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content p={6}>
              <Dialog.Header>
                <Dialog.Title>{t.header.registerTitle}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body pt={4}>
                <VStack gap={4}>
                  <Text fontSize="sm" color="gray.400">
                    {t.header.walletInfoText}{' '}
                    <ChakraLink
                      href={'https://github.com/w3hc/w3pk/blob/main/src/auth/register.ts#L17-L102'}
                      color={brandColors.accent}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      w3pk
                    </ChakraLink>
                    .
                  </Text>
                  <Field invalid={isUsernameInvalid} label={t.header.usernameLabel}>
                    <Input
                      id="username-input"
                      aria-describedby={
                        isUsernameInvalid && username.trim() ? 'username-error' : undefined
                      }
                      aria-invalid={isUsernameInvalid && username.trim() ? true : undefined}
                      value={username}
                      onChange={e => handleUsernameChange(e.target.value)}
                      placeholder={t.header.usernamePlaceholder}
                      pl={3}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && username.trim()) {
                          handleRegister()
                        }
                      }}
                    />
                    {isUsernameInvalid && username.trim() && (
                      <Field.ErrorText id="username-error">
                        {t.header.usernameError}
                      </Field.ErrorText>
                    )}
                  </Field>{' '}
                  <ChakraLink
                    as={Link}
                    href="/settings#restore-backup"
                    onClick={handleModalClose}
                    fontSize="sm"
                    color={brandColors.accent}
                    alignSelf="flex-start"
                  >
                    {t.header.alreadyRegisteredLink}
                  </ChakraLink>
                </VStack>
              </Dialog.Body>

              <Dialog.Footer gap={3} pt={6}>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">{t.common.cancel}</Button>
                </Dialog.ActionTrigger>
                <Button colorPalette="blue" onClick={handleRegister} disabled={!username.trim()}>
                  {isRegistering && <Spinner size="50px" />}
                  {!isRegistering && t.header.createAccount}
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
