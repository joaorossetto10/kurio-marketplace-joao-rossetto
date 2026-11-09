import { z } from 'zod'
import { ETH_PATTERN } from '@/shared/lib/eth'

export const decimalEth = z.string().regex(ETH_PATTERN)
export const categorySchema = z.enum([
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
])
export const collectionSchema = z.enum([
  'kurio-apes',
  'kurio-editions',
  'genesis',
])
export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export const artworkSchema = z.enum(['emerald', 'sage', 'ivory', 'golden'])
export const nftPreviewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  artwork: artworkSchema,
  priceEth: decimalEth,
  version: z.number().int().positive(),
  category: categorySchema,
  collection: collectionSchema,
  network: networkSchema,
})
const facetSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
})
export const nftListSchema = z.object({
  items: z.array(nftPreviewSchema).max(100),
  total: z.number().int().nonnegative(),
  query: z.string(),
  page: z.number().int().positive(),
  pageSize: z.literal(9),
  totalPages: z.number().int().positive(),
  facets: z.object({
    categories: z.array(facetSchema.extend({ id: categorySchema })),
    collections: z.array(facetSchema.extend({ id: collectionSchema })),
    networks: z.array(facetSchema.extend({ id: networkSchema })),
  }),
})
export const editionSchema = z.object({
  id: z.string(),
  label: z.string(),
  stock: z.number().int().min(0).max(1000),
  priceEth: decimalEth,
})
export const nftDetailSchema = nftPreviewSchema.extend({
  tokenId: z.string(),
  description: z.string(),
  creator: z.string(),
  attributes: z.array(z.string()),
  gallery: z.array(artworkSchema).min(1),
  editions: z.array(editionSchema).min(1),
  defaultEditionId: z.string(),
  rating: z.string(),
  reviewCount: z.number().int().nonnegative(),
  contractAddress: z.string(),
  royaltyLabel: z.string(),
  collectionLabel: z.string(),
  networkLabel: z.string(),
  related: z.array(nftPreviewSchema),
})
export const addCartItemSchema = z
  .object({
    nftId: z.string().min(1).max(80),
    editionId: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(1000),
  })
  .strict()
export const cartLineSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  artwork: artworkSchema,
  editionLabel: z.string(),
  quantity: z.number().int().positive(),
  unitPriceEth: decimalEth,
  lineTotalEth: decimalEth,
  stock: z.number().int().nonnegative(),
})
export const cartSchema = z.object({
  visitorId: z.uuid(),
  version: z.number().int().nonnegative(),
  items: z.array(cartLineSchema),
  totalQuantity: z.number().int().nonnegative(),
  subtotalEth: decimalEth,
  coupon: z.string().nullable(),
})
export const cartQuantitySchema = z
  .object({
    quantity: z.number().int().min(1).max(2000),
  })
  .strict()
export const couponInputSchema = z
  .object({ code: z.string().trim().min(1).max(40) })
  .strict()
export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  email: z.email(),
})
export const sessionSchema = z.object({
  user: userSchema,
  expiresAt: z.number().int().positive(),
})
export const authResultSchema = sessionSchema.extend({ token: z.uuid() })
export const loginInputSchema = z
  .object({ email: z.email(), password: z.string().min(1) })
  .strict()
export const registerInputSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    email: z.email(),
    password: z.string().min(10).max(100),
  })
  .strict()
export const avatarSchema = z.enum(['emerald', 'sage', 'ivory', 'golden'])
export const profileSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  username: z.string().min(2),
  email: z.email(),
  ens: z.string(),
  walletNickname: z.string(),
  avatar: avatarSchema.nullable(),
})
export const profileInputSchema = profileSchema
  .omit({ id: true })
  .extend({
    name: z.string().trim().min(2).max(80),
    username: z.string().trim().min(2).max(40),
    ens: z.string().trim().max(80),
    walletNickname: z.string().trim().max(60),
  })
  .strict()
export const passwordInputSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10).max(100),
  })
  .strict()
export const walletSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  label: z.string(),
  address: z.string(),
  network: networkSchema,
  nickname: z.string().default(''),
  profileName: z.string().default(''),
  type: z.enum(['metamask', 'walletconnect', 'coinbase']).default('metamask'),
  email: z.email().or(z.literal('')).default(''),
  ens: z.string().default(''),
  referralCode: z.string().default(''),
  secondaryAddress: z.string().default(''),
  isPrimary: z.boolean().default(false),
})
export const walletsSchema = z.array(walletSchema)
export const walletInputSchema = z
  .object({
    label: z.string().trim().min(2).max(60),
    nickname: z.string().trim().min(2).max(60),
    address: z
      .string()
      .trim()
      .regex(/^(0x[a-fA-F0-9]{40}|[a-z0-9.-]+\.eth)$/i),
    network: networkSchema,
    profileName: z.string().trim().min(2).max(80),
    type: z.enum(['metamask', 'walletconnect', 'coinbase']),
    email: z.email(),
    ens: z.string().trim().min(2).max(80),
    referralCode: z.string().trim().min(2).max(40),
    secondaryAddress: z.string().trim().max(120),
  })
  .strict()
export const connectWalletSchema = z
  .object({
    walletId: z.string(),
    network: networkSchema,
    provider: z.enum(['metamask', 'walletconnect', 'coinbase']),
  })
  .strict()
export const walletConnectionSchema = connectWalletSchema.extend({
  connected: z.boolean(),
})
export const quoteLineSchema = cartLineSchema
export const cartSummarySchema = z.object({
  cartVersion: z.number().int().nonnegative(),
  commercialVersion: z.number().int().positive(),
  subtotalEth: decimalEth,
  discountEth: decimalEth,
  feeEth: decimalEth,
  totalEth: decimalEth,
  coupon: z.string().nullable(),
})
export const quoteSchema = z.object({
  id: z.uuid(),
  ownerId: z.string(),
  cartVersion: z.number().int().nonnegative(),
  commercialVersion: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  items: z.array(quoteLineSchema).min(1),
  coupon: z.string().nullable(),
  subtotalEth: decimalEth,
  discountEth: decimalEth,
  feeEth: decimalEth,
  totalEth: decimalEth,
  walletId: z.string(),
  network: networkSchema,
  provider: connectWalletSchema.shape.provider,
})
export const quoteInputSchema = connectWalletSchema
export const buyerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.email(),
    note: z.string().max(500),
  })
  .strict()
export const createOrderSchema = z
  .object({
    quoteId: z.uuid(),
    walletId: z.string(),
    network: networkSchema,
    provider: connectWalletSchema.shape.provider,
    buyer: buyerSchema,
  })
  .strict()
export const orderSchema = z.object({
  id: z.uuid(),
  ownerId: z.string(),
  visitorId: z.uuid(),
  status: z.enum(['pending', 'confirmed', 'declined']),
  version: z.number().int().positive(),
  createdAt: z.number().int().positive(),
  transactionRef: z.string().nullable(),
  quote: quoteSchema,
  buyer: buyerSchema,
})
export const businessEventSchema = z.object({
  eventId: z.uuid(),
  resourceId: z.string(),
  version: z.number().int().positive(),
  ownerId: z.string().nullable(),
  type: z.enum(['nft.updated', 'order.updated']),
})
export const favoritesSchema = z.object({
  version: z.number().int().nonnegative(),
  items: z.array(nftPreviewSchema),
})
export const favoriteInputSchema = z
  .object({ nftId: z.string().min(1) })
  .strict()
export const resetResultSchema = z.object({ reset: z.literal(true) })
export const healthSchema = z.object({
  service: z.literal('kurio-demo'),
  revision: z.number().int().positive(),
  scenario: z.string(),
  message: z.string(),
})
export const errorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})
export const socketProbeSchema = z.object({
  eventId: z.string(),
  resourceId: z.literal('transport-probe'),
  version: z.number().int().positive(),
  transport: z.literal('websocket'),
  message: z.string(),
})
export type NftPreview = z.infer<typeof nftPreviewSchema>
export type NftDetail = z.infer<typeof nftDetailSchema>
export type NftList = z.infer<typeof nftListSchema>
export type Cart = z.infer<typeof cartSchema>
export type AddCartItem = z.infer<typeof addCartItemSchema>
export type SocketProbe = z.infer<typeof socketProbeSchema>
export type Session = z.infer<typeof sessionSchema>
export type AuthResult = z.infer<typeof authResultSchema>
export type Wallet = z.infer<typeof walletSchema>
export type WalletConnection = z.infer<typeof walletConnectionSchema>
export type Quote = z.infer<typeof quoteSchema>
export type CartSummary = z.infer<typeof cartSummarySchema>
export type Order = z.infer<typeof orderSchema>
export type BusinessEvent = z.infer<typeof businessEventSchema>
export type Profile = z.infer<typeof profileSchema>
export type WalletInput = z.infer<typeof walletInputSchema>
export type Favorites = z.infer<typeof favoritesSchema>
