import '@testing-library/jest-dom'

// Admin pages cache what they fetch; start every test with an empty cache.
import { afterEach } from 'vitest'
import { resetFallbackQueryClient } from '@/lib/queryClient'
afterEach(() => resetFallbackQueryClient())
