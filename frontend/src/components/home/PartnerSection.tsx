"use client";

import { JoinOurCommunity } from "./JoinOurCommunity";
import { SubscriptionNewsletter } from "./SubscriptionNewsletter";

interface CommunityNewsletterSectionProps {
    onApplyClick?: () => void;
    onSubscribe?: (email: string) => void;
}

export function PartnerSection({ 
    onApplyClick, 
    onSubscribe 
}: CommunityNewsletterSectionProps) {
    return (
        <section className="py-12 xs:py-16 sm:py-20 md:py-24 lg:py-section-gap px-4 xs:px-6 sm:px-8 md:px-12 lg:px-margin-desktop max-w-container-max mx-auto mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-5 sm:gap-6 md:gap-8 lg:gap-gutter">
                {/* LEFT: Join Community */}
                <JoinOurCommunity onApplyClick={onApplyClick} />

                {/* RIGHT: Newsletter */}
                <SubscriptionNewsletter onSubscribe={onSubscribe} />
            </div>
        </section>
    );
}