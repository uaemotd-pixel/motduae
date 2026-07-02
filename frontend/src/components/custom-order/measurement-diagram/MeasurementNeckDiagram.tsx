import MeasurementGuideImage from "./MeasurementGuideImage";

export default function MeasurementNeckDiagram() {
    return (
        <MeasurementGuideImage
            cropClassName="aspect-[5/4] w-full max-w-[320px] min-h-[240px]"
            imageClassName="object-contain"
            zoom={{ scale: 2.4, originX: "42%", originY: "12%" }}
            alt="Neck measurement guide"
        />
    );
}
