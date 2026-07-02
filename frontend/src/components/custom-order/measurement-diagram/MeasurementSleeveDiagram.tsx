import MeasurementGuideImage from "./MeasurementGuideImage";

export default function MeasurementSleeveDiagram() {
    return (
        <MeasurementGuideImage
            cropClassName="aspect-[4/5] w-full max-w-[240px] min-h-[260px]"
            imageClassName="object-contain"
            zoom={{ scale: 2.5, originX: "82%", originY: "52%" }}
            alt="Sleeve measurement guide"
        />
    );
}
