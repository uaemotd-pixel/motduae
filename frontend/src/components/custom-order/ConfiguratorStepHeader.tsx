type ConfiguratorStepHeaderProps = {
    title: string;
    description: string;
    stepLabel: string;
};

export default function ConfiguratorStepHeader({
    title,
    description,
    stepLabel,
}: ConfiguratorStepHeaderProps) {
    return (
        <div className="mb-10">
            <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-3">
                {stepLabel}
            </p>
            <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-black mb-3">
                {title}
            </h1>
            <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) max-w-2xl">
                {description}
            </p>
        </div>
    );
}
