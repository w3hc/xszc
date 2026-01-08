'use client'

import { Box, Text } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function LogoOverlay() {
  const pathname = usePathname()

  // Don't show on homepage
  if (pathname === '/') {
    return null
  }

  return (
    <Box
      position="fixed"
      top={4}
      left={4}
      zIndex={1000}
      pointerEvents="auto"
      bg="rgba(0, 0, 0, 0.8)"
      backdropFilter="blur(10px)"
      py={2}
      px={3}
      borderRadius="md"
    >
      <Link href="/" style={{ textDecoration: 'none' }}>
        <Text
          fontSize="sm"
          color="gray.300"
          cursor="pointer"
          _hover={{ color: 'white' }}
          transition="color 0.2s"
        >
          像素众创
        </Text>
      </Link>
    </Box>
  )
}
