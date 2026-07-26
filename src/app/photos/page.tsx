import PhotoGallery from "./PhotoGallery";
import { allPhotos, heroPhoto, photoSeries } from "@/lib/photos";

export default function PhotosPage() {
  return <PhotoGallery hero={heroPhoto} series={photoSeries} photos={allPhotos} />;
}
