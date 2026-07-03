import MeasurementGuideImage from "./MeasurementGuideImage";

export default function MeasurementBodyDiagram() {
    return (
        <MeasurementGuideImage
            cropClassName="aspect-[4/5] w-full min-h-[380px] sm:min-h-[440px] lg:min-h-[520px] max-w-[560px] mx-auto lg:max-w-none"
            imageClassName="object-contain p-3 sm:p-4"
            alt="Front garment measurement guide"
        />
    );
}
