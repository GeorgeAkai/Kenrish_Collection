import AnalyticsView from '@/components/admin/AnalyticsView'

/** Analytics for a single shop (Kenrish Beauty or Kenrish Fashion). */
export default function AdminShopAnalyticsPage({ shop }: { shop: 'beauty' | 'fashion' }) {
  return <AnalyticsView scope={shop} title={shop === 'beauty' ? 'Beauty analytics' : 'Fashion analytics'} />
}
