import CatalogueAdmin from '@/components/admin/CatalogueAdmin'

export default function AdminClothesPage() {
  return (
    <CatalogueAdmin
      title="Clothes"
      endpoint="/admin/clothes"
      itemType="clothes"
      extraFields={[
        { name: 'size', label: 'Size' },
        { name: 'color', label: 'Color' },
      ]}
    />
  )
}
