import MainLayout from "@/app/[locale]/main/layout";
import HomePage from "@/app/[locale]/main/page";

export default function LocalePage() {
    return (
        <MainLayout>
            <HomePage />
        </MainLayout>
    );
}