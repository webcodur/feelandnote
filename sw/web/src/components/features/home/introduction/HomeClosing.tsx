import Lane from '@/components/ui/pending/Lane'
import HomeDiscoveryGallery from './HomeDiscoveryGallery'
import HomeSearchForm from './HomeSearchForm'
import galleryStyles from './HomeDiscoveryGallery.module.css'

export default function HomeClosing() {
  return <>
    <Lane fallback={<div className={galleryStyles.gallery} aria-hidden>
      {[0, 1].map(index => <div className={galleryStyles.entry} key={index}><span className={galleryStyles.stack} /><span className={galleryStyles.label} /></div>)}
    </div>}>
      <HomeDiscoveryGallery />
    </Lane>
    <HomeSearchForm />
  </>
}
