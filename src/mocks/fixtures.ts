import type { NftPreview, NftDetail } from '@/shared/api/contracts'
import { fromWei, toWei } from '@/shared/lib/eth'

const originalPreviews: Pick<
  NftPreview,
  'id' | 'name' | 'artwork' | 'priceEth' | 'version'
>[] = [
  {
    id: 'emerald-042',
    name: 'Emerald Ape #042',
    artwork: 'emerald',
    priceEth: '1.19',
    version: 1,
  },
  {
    id: 'sage-009',
    name: 'Sage Nomad #009',
    artwork: 'sage',
    priceEth: '1.69',
    version: 1,
  },
  {
    id: 'neon-552',
    name: 'Neon Vessel #552',
    artwork: 'ivory',
    priceEth: '1.99',
    version: 1,
  },
  {
    id: 'cosmic-118',
    name: 'Cosmic Bloom #118',
    artwork: 'sage',
    priceEth: '1.29',
    version: 1,
  },
  {
    id: 'violet-314',
    name: 'Violet Nomad #314',
    artwork: 'sage',
    priceEth: '1.39',
    version: 1,
  },
  {
    id: 'ivory-088',
    name: 'Ivory Baron #088',
    artwork: 'ivory',
    priceEth: '1.79',
    version: 1,
  },
  {
    id: 'golden-207',
    name: 'Golden Beat #207',
    artwork: 'golden',
    priceEth: '0.99',
    version: 1,
  },
  {
    id: 'amber-208',
    name: 'Amber Echo #208',
    artwork: 'golden',
    priceEth: '0.89',
    version: 1,
  },
  {
    id: 'signal-160',
    name: 'Golden Signal #160',
    artwork: 'golden',
    priceEth: '0.39',
    version: 1,
  },
]

export const categories = [
  { id: 'arte-digital', label: 'Arte digital' },
  { id: 'fotografia', label: 'Fotografia' },
  { id: 'musica', label: 'Música' },
  { id: 'arte-3d', label: 'Arte 3D' },
] as const
export const collections = [
  { id: 'kurio-apes', label: 'Kurio Apes' },
  { id: 'kurio-editions', label: 'Kurio Editions' },
  { id: 'genesis', label: 'Gênesis' },
] as const
export const networks = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
] as const
const metadata: Pick<NftPreview, 'category' | 'collection' | 'network'>[] = [
  { category: 'arte-digital', collection: 'kurio-apes', network: 'ethereum' },
  { category: 'arte-digital', collection: 'kurio-apes', network: 'polygon' },
  { category: 'arte-3d', collection: 'kurio-editions', network: 'solana' },
  { category: 'arte-digital', collection: 'genesis', network: 'ethereum' },
  { category: 'arte-digital', collection: 'kurio-apes', network: 'ethereum' },
  { category: 'fotografia', collection: 'genesis', network: 'ethereum' },
  { category: 'musica', collection: 'kurio-editions', network: 'polygon' },
  { category: 'arte-3d', collection: 'genesis', network: 'solana' },
  { category: 'musica', collection: 'kurio-editions', network: 'ethereum' },
]
const extra: Pick<NftPreview, 'id' | 'name' | 'artwork' | 'priceEth'>[] = [
  {
    id: 'obsidian-710',
    name: 'Obsidian Horizon #710',
    artwork: 'ivory',
    priceEth: '2.6',
  },
  {
    id: 'copper-211',
    name: 'Copper Dawn #211',
    artwork: 'golden',
    priceEth: '0.12',
  },
  {
    id: 'forest-312',
    name: 'Forest Echo #312',
    artwork: 'emerald',
    priceEth: '1.05',
  },
  {
    id: 'lunar-413',
    name: 'Lunar Muse #413',
    artwork: 'sage',
    priceEth: '3.125',
  },
  {
    id: 'velvet-514',
    name: 'Velvet Orbit #514',
    artwork: 'ivory',
    priceEth: '0.000000000000000001',
  },
  {
    id: 'sonic-615',
    name: 'Sonic Roots #615',
    artwork: 'golden',
    priceEth: '0.75',
  },
  {
    id: 'jade-716',
    name: 'Jade Studio #716',
    artwork: 'emerald',
    priceEth: '1.8',
  },
  {
    id: 'quiet-817',
    name: 'Quiet Frame #817',
    artwork: 'sage',
    priceEth: '2.01',
  },
  {
    id: 'solar-918',
    name: 'Solar Pulse #918',
    artwork: 'golden',
    priceEth: '0.49',
  },
  {
    id: 'moss-119',
    name: 'Moss Archive #119',
    artwork: 'emerald',
    priceEth: '1.49',
  },
  {
    id: 'night-220',
    name: 'Night District #220',
    artwork: 'ivory',
    priceEth: '4.2',
  },
  {
    id: 'studio-321',
    name: 'Studio Nomad #321',
    artwork: 'sage',
    priceEth: '0.95',
  },
]

const previews: NftPreview[] = [
  ...originalPreviews,
  ...extra.map((item) => ({ ...item, version: 1 })),
].map((item, index) => ({
  ...item,
  ...(metadata[index % metadata.length] ?? {
    category: 'arte-digital',
    collection: 'kurio-apes',
    network: 'ethereum',
  }),
}))

export const nftCatalog: NftDetail[] = previews.map((item, index) => ({
  ...item,
  tokenId: `#${item.id.split('-').at(-1)?.padStart(4, '0') ?? '0000'}`,
  collectionLabel:
    collections.find((c) => c.id === item.collection)?.label ?? 'Kurio Apes',
  networkLabel:
    networks.find((n) => n.id === item.network)?.label ?? 'Ethereum',
  description:
    'Um colecionável digital 1/50 finalizado à mão da coleção Kurio Editions, com arte desbloqueável e acesso para colecionadores.',
  creator: 'Nova Sato',
  attributes:
    item.artwork === 'emerald'
      ? ['Óculos', 'Esmeralda', 'Raro']
      : ['Arte digital', 'Edição selecionada'],
  // The official detail frame repeats the same artwork in all four slots.
  gallery: [item.artwork, item.artwork, item.artwork, item.artwork],
  editions: [
    { id: 'one', label: '1/1', stock: 0, priceEth: item.priceEth },
    {
      id: 'ten',
      label: '1/10',
      stock: 2,
      priceEth: fromWei(toWei(item.priceEth) + toWei('0.2')),
    },
    {
      id: 'fifty',
      label: '1/50',
      stock: index === 0 ? 3 : 8,
      priceEth: item.priceEth,
    },
    { id: 'open', label: 'ABERTA', stock: 50, priceEth: item.priceEth },
  ],
  defaultEditionId: 'fifty',
  rating: '4.8',
  reviewCount: 19,
  contractAddress: '0x7A42…19E8',
  royaltyLabel: '5% nas vendas secundárias',
  related: [],
}))

export function toPreview(nft: NftDetail): NftPreview {
  const {
    id,
    name,
    artwork,
    priceEth,
    version,
    category,
    collection,
    network,
  } = nft
  return { id, name, artwork, priceEth, version, category, collection, network }
}
