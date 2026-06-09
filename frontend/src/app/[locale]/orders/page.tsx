import OrdersView from "@/components/orders/OrdersView";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function OrdersPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <OrdersView />
            </FadeInSection>
        </MainLayout>
    );
}
