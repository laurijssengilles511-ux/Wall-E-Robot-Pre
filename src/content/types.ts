export type PageId = 'story' | 'structure' | 'electronics' | 'reflection' | 'future' | 'virtual'
export interface ProjectSection { id: PageId; path: string; title: string; number: string; subtitle: string }
export interface ModelAsset { id: string; title: string; category: string; categoryTitle: string; filename: string; path: string; preview: string; plannedQuantity: number; bytes: number; triangles: number; dimensions: number[]; source: string }
export interface ModelInventoryItem { id: string; title: string; category: string; filename: string; quantity: number; printGroup: string }
export interface SourceDocument { name: string; path: string; bytes: number }
export interface ImageInfo { src: string; title: string; caption: string; rotated?: boolean }
export interface PageProps { openImage: (image: ImageInfo) => void; openSources: () => void }
