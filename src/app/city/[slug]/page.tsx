import { Suspense } from 'react';
import BackLink from '@/components/BackLink';
import CityView from '@/components/CityView';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * `params` не читаются на уровне страницы: иначе оболочка маршрута зависела бы от URL
 * (`partialPrefetching`). Ожидание — внутри `Suspense`, «Назад» остаётся в общей оболочке.
 */
export default function CityPage({ params }: Props) {
  return (
    <>
      <BackLink />
      <Suspense fallback={<LoadingSkeleton variant="weather" />}>
        <CityContent params={params} />
      </Suspense>
    </>
  );
}

async function CityContent({ params }: Props) {
  const { slug } = await params;
  return <CityView slug={slug} />;
}
