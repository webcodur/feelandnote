import { PendingBlock } from "@/components/ui/pending";
import PageContainer from "@/components/layout/PageContainer";
import styles from "@/components/features/content/ContentDetail.module.css";

/** 표지와 제목 자리를 먼저 잡아 작품 정보가 들어올 때 화면 이동을 줄인다. */
export default function ContentDetailPending() {
  return <PageContainer className={styles.container}><div className="space-y-3">
    <div aria-hidden="true" className="flex h-9 items-center justify-between">
      <div className="h-2 w-16 rounded-full bg-text-secondary/10" />
      <div className="h-7 w-24 rounded-lg border border-border/60" />
    </div>
    <div aria-hidden="true" className="flex h-10 items-center justify-center"><div className="h-2 w-20 rounded-full bg-text-secondary/10" /></div>
    <PendingBlock variant="panel" minHeight="min-h-80">
      <div className={styles.hero}>
        <div className={styles.banner} />
        <div className={styles.identity}>
          <div className={styles.coverColumn}><div className={styles.cover} /></div>
          <div className={styles.identityCopy}>
            <div className="h-3 w-3/4 rounded-full bg-text-secondary/10" />
            <div className="h-2 w-1/3 rounded-full bg-text-secondary/[0.06]" />
            <div className="space-y-3 pt-5">
              <div className="h-1.5 rounded-full bg-text-secondary/[0.06]" />
              <div className="h-1.5 w-5/6 rounded-full bg-text-secondary/[0.06]" />
              <div className="h-1.5 w-2/3 rounded-full bg-text-secondary/[0.06]" />
            </div>
          </div>
        </div>
      </div>
    </PendingBlock>
    <PendingBlock variant="rows" count={3} />
  </div></PageContainer>;
}
