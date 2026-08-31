"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Search,
  Sparkles,
  Scissors,
  Ruler,
  ShoppingBag,
  Truck,
  CreditCard,
  ChevronRight,
  ArrowDown
} from "lucide-react";

interface FAQItem {
  id: string;
  sectionId: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
}

const FAQ_ITEMS: FAQItem[] = [
  // Section 1: Getting Started
  {
    id: "gs-1",
    sectionId: "section-1",
    questionEn: "What is MOTD?",
    questionAr: "ما هي منصة MOTD؟",
    answerEn: "MOTD (Mukhawar of the Day) is an online platform dedicated to the timeless elegance of the Emirati Mukhawar. We bring together carefully selected designs, premium fabrics and skilled tailors in one seamless experience, allowing you to create a Mukhawar that is uniquely yours.\n\nWhether you're ordering for everyday wear, special occasions or gifting, every piece is made with care, craftsmanship and attention to detail.",
    answerAr: "MOTD (مخوار اليوم) هي منصة إلكترونية تُعنى بالأناقة الخالدة للمخوار الإماراتي. نجمع بين تصاميم مختارة بعناية، وأقمشة فاخرة، وخياطين مهرة في تجربة سلسة، تتيح لك تصميم مخوار فريد من نوعه.\n\nسواء كنت تطلبه للاستخدام اليومي، أو للمناسبات الخاصة، أو كهدية، فإن كل قطعة مصنوعة بعناية فائقة، وحرفية عالية، واهتمام دقيق بالتفاصيل."
  },
  {
    id: "gs-2",
    sectionId: "section-1",
    questionEn: "What is a Mukhawar?",
    questionAr: "ما هو المخوار؟",
    answerEn: "A Mukhawar is a traditional Emirati dress that has been worn by women for generations. Known for its elegant silhouette and distinctive hand embroidery, each Mukhawar reflects the rich cultural heritage of the UAE while allowing room for personal style and creativity.\n\nToday, Mukhawars are worn for everyday elegance, family gatherings, celebrations, and special occasions, with endless possibilities for fabrics, embroidery, and design details.",
    answerAr: "المخوار هو زي إماراتي تقليدي ترتديه النساء منذ أجيال. يشتهر بشكله الأنيق وتطريزه اليدوي المميز، ويعكس كل مخوار التراث الثقافي الغني لدولة الإمارات مع ترك مساحة للأسلوب الشخصي والإبداع.\n\nاليوم، يُرتدى المخوار للأناقة اليومية، والتجمعات العائلية، والمناسبات السعيدة، والمناسبات الخاصة، مع إمكانيات لا حصر لها من الأقمشة والتطريز وتفاصيل التصميم."
  },
  {
    id: "gs-3",
    sectionId: "section-1",
    questionEn: "How does MOTD work?",
    questionAr: "كيف تعمل منصة MOTD؟",
    answerEn: "Ordering your Mukhawar is simple.\n1. Choose your preferred design.\n2. Select your preferred fabric or choose to provide one.\n3. Add your measurements or select a saved measurement profile.\n4. Place your order securely online.\n\nOnce your order is confirmed, we coordinate the journey from fabric selection to tailoring and quality review before delivering your finished Mukhawar to your doorstep.",
    answerAr: "طلب المخوار الخاص بك بسيط.\n1. اختر التصميم الذي تفضله.\n2. اختر القماش المفضل لديك أو اختر توفير قماشك الخاص.\n3. أضف مقاساتك أو اختر ملف قياسات محفوظ.\n4. ضع طلبك بشكل آمن عبر الإنترنت.\n\nبمجرد تأكيد طلبك، نقوم بتنسيق الرحلة من اختيار القماش إلى الخياطة ومراجعة الجودة قبل توصيل المخوار النهائي إلى باب منزلك."
  },
  {
    id: "gs-4",
    sectionId: "section-1",
    questionEn: "Is MOTD a tailor?",
    questionAr: "هل MOTD هي خياط؟",
    answerEn: "No.\n\nMOTD is a platform that connects customers with carefully selected tailors and fabric suppliers while overseeing the entire experience from order placement to delivery.\nEvery tailor featured on MOTD is chosen based on their craftsmanship, quality and reliability.",
    answerAr: "لا.\n\nMOTD هي منصة تربط العملاء بخياطين وموردي أقمشة مختارين بعناية، وتشرف على التجربة بأكملها من تقديم الطلب إلى التوصيل.\nيتم اختيار كل خياط على MOTD بناءً على حرفيته وجودته وموثوقيته."
  },
  {
    id: "gs-5",
    sectionId: "section-1",
    questionEn: "Why should I order through MOTD instead of contacting a tailor directly?",
    questionAr: "لماذا أطلب عبر MOTD بدلاً من الاتصال بالخياط مباشرة؟",
    answerEn: "MOTD simplifies what is often a time-consuming process.\n\nInstead of searching for a tailor, sourcing fabrics and coordinating everything yourself, MOTD brings the entire experience together in one place.\n\nWith MOTD you can:\n• Browse curated Mukhawar designs.\n• Discover premium fabrics.\n• Choose from trusted tailoring partners.\n• Save measurement profiles for future orders.\n• Track your order from production to delivery.\n• Enjoy a carefully managed customer experience from start to finish.",
    answerAr: "تقوم MOTD بتبسيط ما غالباً ما يكون عملية مستهلكة للوقت.\n\nبدلاً من البحث عن خياط، وتوفير الأقمشة، وتنسيق كل شيء بنفسك، تجمع MOTD التجربة بأكملها في مكان واحد.\n\nمع MOTD يمكنك:\n• تصفح تصاميم المخوار المختارة.\n• اكتشاف الأقمشة الفاخرة.\n• الاختيار من بين شركاء خياطة موثوقين.\n• حفظ ملفات القياسات للطلبات المستقبلية.\n• تتبع طلبك من الإنتاج إلى التوصيل.\n• الاستمتاع بتجربة عميل مُدارة بعناية من البداية إلى النهاية."
  },
  {
    id: "gs-6",
    sectionId: "section-1",
    questionEn: "Do I need to create an account?",
    questionAr: "هل أحتاج إلى إنشاء حساب؟",
    answerEn: "Creating an account is recommended, as it allows you to:\n• Save your favourite designs and fabrics.\n• Store multiple measurement profiles.\n• View your order history.\n• Reorder previous Mukhawars with ease.\n• Track your orders.\n• Manage your personal details securely.",
    answerAr: "يُنصح بإنشاء حساب، حيث يتيح لك:\n• حفظ التصاميم والأقمشة المفضلة لديك.\n• تخزين ملفات قياسات متعددة.\n• عرض سجل طلباتك.\n• إعادة طلب المخوارات السابقة بسهولة.\n• تتبع طلباتك.\n• إدارة تفاصيلك الشخصية بأمان."
  },
  {
    id: "gs-7",
    sectionId: "section-1",
    questionEn: "Can I place an order without an account?",
    questionAr: "هل يمكنني تقديم طلب بدون حساب؟",
    answerEn: "Yes. Guests may place an order without creating an account. However, creating a MOTD account allows you to save your measurements, track orders, access your order history and enjoy a faster checkout experience in the future.",
    answerAr: "نعم. يمكن للضيوف تقديم طلب دون إنشاء حساب. ومع ذلك، فإن إنشاء حساب MOTD يسمح لك بحفظ قياساتك، وتتبع الطلبات، والوصول إلى سجل طلباتك والاستمتاع بتجربة دفع أسرع في المستقبل."
  },
  {
    id: "gs-8",
    sectionId: "section-1",
    questionEn: "Where is MOTD based?",
    questionAr: "أين يقع مقر MOTD؟",
    answerEn: "MOTD is proudly based in the United Arab Emirates, celebrating Emirati heritage through thoughtfully designed Mukhawars and exceptional craftsmanship.\n\nWe work with trusted partners who share our commitment to quality and authenticity.",
    answerAr: "MOTD موجودة بفخر في دولة الإمارات العربية المتحدة، وتحتفل بالتراث الإماراتي من خلال مخوارات مصممة بعناية وحرفية استثنائية.\n\nنعمل مع شركاء موثوقين يشاركوننا الالتزام بالجودة والأصالة."
  },
  {
    id: "gs-9",
    sectionId: "section-1",
    questionEn: "Which countries does MOTD deliver to?",
    questionAr: "إلى أي الدول توصل MOTD؟",
    answerEn: "MOTD currently delivers across the United Arab Emirates.",
    answerAr: "توصل MOTD حالياً في جميع أنحاء دولة الإمارات العربية المتحدة."
  },
  {
    id: "gs-10",
    sectionId: "section-1",
    questionEn: "How can I contact MOTD?",
    questionAr: "كيف يمكنني التواصل مع MOTD؟",
    answerEn: "Our Care Team is always happy to help.\n\nYou can reach us through:\nEmail: care@motd.ae\n\nYou may also contact us through WhatsApp live chat at @MOTDae (+971569722533), Monday to Thursday, during business hours, 10:00 AM to 17:00 PM (UAE time).",
    answerAr: "فريق الرعاية لدينا سعيد دائماً بمساعدتك.\n\nيمكنك التواصل معنا عبر:\nالبريد الإلكتروني: care@motd.ae\n\nيمكنك أيضاً التواصل معنا عبر الدردشة المباشرة على واتساب على @MOTDae (+971569722533)، من الاثنين إلى الخميس، خلال ساعات العمل، من 10:00 صباحاً إلى 5:00 مساءً (بتوقيت الإمارات)."
  },
  {
    id: "gs-11",
    sectionId: "section-1",
    questionEn: "How do I know which Mukhawar is right for me?",
    questionAr: "كيف أعرف أي مخوار مناسب لي؟",
    answerEn: "Every woman has her own style.\n\nUse our filters to browse by:\n• Design\n• Fabric\n• Colour\n• Occasion\n• Embroidery style\n• New Arrivals\n• Best Sellers\n\nIf you're unsure where to begin, our Care Team will be delighted to help you choose the perfect combination.",
    answerAr: "لكل امرأة أسلوبها الخاص.\n\nاستخدم عوامل التصفية للتصفح حسب:\n• التصميم\n• القماش\n• اللون\n• المناسبة\n• أسلوب التطريز\n• الوافدين الجدد\n• الأكثر مبيعاً\n\nإذا كنت غير متأكدة من أين تبدأين، سيسعد فريق الرعاية لدينا بمساعدتك في اختيار التركيبة المثالية."
  },
  {
    id: "gs-12",
    sectionId: "section-1",
    questionEn: "Can I visit a physical showroom?",
    questionAr: "هل يمكنني زيارة صالة عرض فعلية؟",
    answerEn: "MOTD is currently an online experience designed to make ordering your Mukhawar simple and convenient from anywhere.\n\nIf we host pop-up events, exhibitions or fitting appointments in the future, we'll announce them through our website and social media channels.",
    answerAr: "MOTD حالياً هي تجربة إلكترونية مصممة لجعل طلب المخوار بسيطاً ومريحاً من أي مكان.\n\nإذا استضفنا فعاليات منبثقة أو معارض أو مواعيد تجربة في المستقبل، سنعلن عنها عبر موقعنا الإلكتروني وقنوات التواصل الاجتماعي."
  },
  {
    id: "gs-13",
    sectionId: "section-1",
    questionEn: "Is every Mukhawar made to order?",
    questionAr: "هل كل مخوار يُصنع حسب الطلب؟",
    answerEn: "Most designs on MOTD are available for you to personalise by selecting your preferred fabric, measurements, and any available design customisations, allowing you to create a Mukhawar that's uniquely yours.\n\nIf you're looking for something ready to wear, you can also explore our Ready to Order collection. These pieces are already made and available for quicker delivery, with each listing clearly identified on the product page.",
    answerAr: "معظم التصاميم على MOTD متاحة لتخصيصها باختيار القماش المفضل لديك، والقياسات، وأي تخصيصات تصميم متاحة، مما يتيح لك إنشاء مخوار فريد لك.\n\nإذا كنت تبحث عن شيء جاهز للارتداء، يمكنك أيضاً استكشاف مجموعتنا الجاهزة للطلب. هذه القطع مُصنعة بالفعل ومتاحة للتوصيل بشكل أسرع، مع تحديد كل قائمة بوضوح على صفحة المنتج."
  },
  {
    id: "gs-14",
    sectionId: "section-1",
    questionEn: "How do I know if a product is Ready to Order?",
    questionAr: "كيف أعرف إذا كان المنتج جاهزاً للطلب؟",
    answerEn: "Ready to Order pieces are clearly labelled on the product page. You'll also find them in the dedicated Ready to Order section, where you can browse Mukhawars that are already made and available for faster delivery.",
    answerAr: "القطع الجاهزة للطلب مُعلَّمة بوضوح على صفحة المنتج. ستجدها أيضاً في قسم الجاهز للطلب المخصص، حيث يمكنك تصفح المخوارات المُصنعة بالفعل والمتاحة للتوصيل بشكل أسرع."
  },

  // Section 2: Creating Your Mukhawar
  {
    id: "cm-1",
    sectionId: "section-2",
    questionEn: "How do I create my Mukhawar?",
    questionAr: "كيف أنشئ المخوار الخاص بي؟",
    answerEn: "There's no single way to create your Mukhawar—you can start wherever inspiration strikes.\n\n• Browse designs to find a style you love.\n• Explore fabrics if you're inspired by a particular colour, texture, or seasonal collection.\n• Or start with a tailor and discover the designs they offer.\n\nAs you explore, you'll build your perfect combination by selecting your design, fabric, and measurements before reviewing your order and completing your purchase. We'll then coordinate every step until your finished Mukhawar arrives at your doorstep.",
    answerAr: "لا توجد طريقة واحدة لإنشاء مخوارك - يمكنك البدء من أي مكان يلهمك.\n\n• تصفح التصاميم للعثور على أسلوب تحبينه.\n• استكشف الأقمشة إذا كنتِ مستوحاة من لون معين أو ملمس أو مجموعة موسمية.\n• أو ابدأ مع الخياط واكتشف التصاميم التي يقدمها.\n\nبينما تستكشفين، ستبنين تركيبتك المثالية باختيار التصميم والقماش والقياسات قبل مراجعة طلبك وإتمام عملية الشراء. سنقوم بعد ذلك بتنسيق كل خطوة حتى يصل المخوار النهائي إلى باب منزلك."
  },
  {
    id: "cm-2",
    sectionId: "section-2",
    questionEn: "Do I choose the design first or the fabric first?",
    questionAr: "هل أختار التصميم أولاً أم القماش أولاً؟",
    answerEn: "It's entirely up to you. You can start with a design, a fabric, or even a tailor. If you're only purchasing fabric, simply browse our fabric collection and place your order without selecting a design or tailor.",
    answerAr: "الأمر متروك لك تماماً. يمكنك البدء بتصميم، أو قماش، أو حتى خياط. إذا كنت تشتري قماشاً فقط، ما عليك سوى تصفح مجموعتنا من الأقمشة وتقديم طلبك دون اختيار تصميم أو خياط."
  },
  {
    id: "cm-3",
    sectionId: "section-2",
    questionEn: "Can I choose any fabric for any design?",
    questionAr: "هل يمكنني اختيار أي قماش لأي تصميم؟",
    answerEn: "In most cases, yes. Many designs can be created using a variety of fabrics, giving you the freedom to create a Mukhawar that reflects your personal style.\n\nTo help you decide, some tailors may also recommend a selection of fabrics they believe best complement a particular design. If a specific fabric isn't suitable for a design, you'll be guided to the available options during the creation process.",
    answerAr: "في معظم الحالات، نعم. يمكن إنشاء العديد من التصاميم باستخدام مجموعة متنوعة من الأقمشة، مما يمنحك الحرية في إنشاء مخوار يعكس أسلوبك الشخصي.\n\nلمساعدتك في اتخاذ القرار، قد يوصي بعض الخياطين بمجموعة من الأقمشة التي يعتقدون أنها تكمل التصميم بشكل أفضل. إذا كان قماش معين غير مناسب لتصميم ما، سيتم توجيهك إلى الخيارات المتاحة أثناء عملية الإنشاء."
  },
  {
    id: "cm-4",
    sectionId: "section-2",
    questionEn: "How do I know which fabric suits a design best?",
    questionAr: "كيف أعرف أي قماش يناسب التصميم بشكل أفضل؟",
    answerEn: "Some designs include fabric recommendations from the tailor to help inspire your choice and make the decision easier. These suggestions highlight fabrics that beautifully complement the design, but you're free to explore other available options.\n\nIf you're unsure, our Care Team is always happy to help you choose the perfect combination.",
    answerAr: "تتضمن بعض التصاميم توصيات الأقمشة من الخياط للمساعدة في إلهام اختيارك وتسهيل القرار. تسلط هذه الاقتراحات الضوء على الأقمشة التي تكمل التصميم بشكل جميل، لكنك حر في استكشاف الخيارات الأخرى المتاحة.\n\nإذا كنت غير متأكد، فإن فريق الرعاية لدينا سعيد دائماً بمساعدتك في اختيار التركيبة المثالية."
  },
  {
    id: "cm-5",
    sectionId: "section-2",
    questionEn: "Can I use my own fabric?",
    questionAr: "هل يمكنني استخدام قماشي الخاص؟",
    answerEn: "Yes. If you're creating a Mukhawar, you can either choose a fabric from MOTD or provide your own fabric.\n\nIf you choose to use your own fabric, simply select the Provide My Own Fabric option and complete your order. We'll then arrange for a courier to contact you and collect the fabric from your preferred location before delivering it to your selected tailor.\n\nOnce received, the tailor will review the fabric to ensure it's suitable for your chosen design. If there are any concerns, we'll contact you to discuss the available options.",
    answerAr: "نعم. إذا كنت تنشئ مخواراً، يمكنك إما اختيار قماش من MOTD أو توفير قماشك الخاص.\n\nإذا اخترت استخدام قماشك الخاص، ما عليك سوى تحديد خيار توفير قماشي الخاص وإكمال طلبك. سنقوم بعد ذلك بترتيب اتصال شركة شحن بك وجمع القماش من الموقع المفضل لديك قبل توصيله إلى الخياط الذي اخترته.\n\nبمجرد الاستلام، سيراجع الخياط القماش للتأكد من أنه مناسب للتصميم الذي اخترته. إذا كانت هناك أي مخاوف، سنتصل بك لمناقشة الخيارات المتاحة."
  },
  {
    id: "cm-6",
    sectionId: "section-2",
    questionEn: "Can I buy fabric without ordering a Mukhawar?",
    questionAr: "هل يمكنني شراء قماش دون طلب مخوار؟",
    answerEn: "Yes.\n\nYou're welcome to purchase fabrics directly from MOTD without ordering tailoring services. Simply browse our fabric collection, add your chosen fabric to your cart, and complete your purchase.",
    answerAr: "نعم.\n\nنرحب بك لشراء الأقمشة مباشرة من MOTD دون طلب خدمات خياطة. ما عليك سوى تصفح مجموعتنا من الأقمشة، وإضافة القماش الذي اخترته إلى سلة التسوق، وإتمام عملية الشراء."
  },
  {
    id: "cm-7",
    sectionId: "section-2",
    questionEn: "Can I order embroidery without fabric?",
    questionAr: "هل يمكنني طلب تطريز بدون قماش؟",
    answerEn: "Yes. If you already have your own fabric, simply choose your preferred design and select the Provide My Own Fabric option during the ordering process.\n\nWe'll arrange for a courier to collect your fabric and deliver it to your selected tailor, who will complete the embroidery and tailoring based on your order before your finished Mukhawar is returned to you.",
    answerAr: "نعم. إذا كان لديك قماشك الخاص بالفعل، ما عليك سوى اختيار التصميم المفضل لديك وتحديد خيار توفير قماشي الخاص أثناء عملية الطلب.\n\nسنرتب لشركة شحن لجمع قماشك وتوصيله إلى الخياط الذي اخترته، والذي سيكمل التطريز والخياطة بناءً على طلبك قبل إعادة المخوار النهائي إليك."
  },
  {
    id: "cm-8",
    sectionId: "section-2",
    questionEn: "What is Tana Lawn Cotton?",
    questionAr: "ما هو قطن تانا لاون؟",
    answerEn: "Tana Lawn Cotton is one of the world's finest cotton fabrics, known for its exceptional softness, lightweight feel and breathable comfort.\n\nIts smooth finish makes it an excellent choice for elegant, comfortable Mukhawars suitable for both everyday wear and special occasions.",
    answerAr: "قطن تانا لاون هو أحد أفضل أقمشة القطن في العالم، المعروف بنعومته الاستثنائية، وخفته، وراحته القابلة للتنفس.\n\nيجعله تشطيبه الناعم خياراً ممتازاً لمخوارات أنيقة ومريحة مناسبة للارتداء اليومي والمناسبات الخاصة."
  },
  {
    id: "cm-9",
    sectionId: "section-2",
    questionEn: "How much fabric do I need?",
    questionAr: "كم أحتاج من القماش؟",
    answerEn: "The amount of fabric required depends on your selected design and your measurements.\n\nIf you're purchasing fabric through MOTD, we'll help ensure you order the appropriate quantity for your Mukhawar. If you're providing your own fabric and additional fabric is required, we'll contact you before production continues.",
    answerAr: "تعتمد كمية القماش المطلوبة على التصميم الذي اخترته وقياساتك.\n\nإذا كنت تشتري قماشاً عبر MOTD، فسنضمن طلب الكمية المناسبة لمخوارك. إذا كنت تقدم قماشك الخاص وكانت هناك حاجة إلى قماش إضافي، فسنتصل بك قبل استمرار الإنتاج."
  },
  {
    id: "cm-10",
    sectionId: "section-2",
    questionEn: "Will the fabric colour look exactly the same as it does online?",
    questionAr: "هل سيبدو لون القماش تماماً كما يظهر على الإنترنت؟",
    answerEn: "We strive to present fabric colours as accurately as possible. However, the appearance of colours may vary slightly depending on lighting conditions, photography, and your device's screen settings.\n\nWe recommend reviewing all available images and product details before placing your order. If you have any questions about a fabric, our Care Team will be happy to assist you.",
    answerAr: "نسعى جاهدين لتقديم ألوان الأقمشة بأكبر قدر ممكن من الدقة. ومع ذلك، قد يختلف مظهر الألوان قليلاً اعتماداً على ظروف الإضاءة والتصوير وإعدادات شاشة جهازك.\n\nنوصي بمراجعة جميع الصور المتاحة وتفاصيل المنتج قبل تقديم طلبك. إذا كان لديك أي أسئلة حول قماش معين، سيسعد فريق الرعاية لدينا بمساعدتك."
  },
  {
    id: "cm-11",
    sectionId: "section-2",
    questionEn: "How do I choose the right fabric for the season?",
    questionAr: "كيف أختار القماش المناسب للموسم؟",
    answerEn: "Each fabric page includes details about the fabric type to help you make an informed choice. As a general guide, lightweight cotton fabrics are ideal for warmer weather, while silk and crepe fabrics are popular choices for elegant wear and special occasions.",
    answerAr: "تتضمن كل صفحة قماش تفاصيل حول نوع القماش لمساعدتك في اتخاذ قرار مستنير. كدليل عام، الأقمشة القطنية الخفيفة مثالية للطقس الدافئ، بينما أقمشة الحرير والكريب هي خيارات شائعة للارتداء الأنيق والمناسبات الخاصة."
  },
  {
    id: "cm-12",
    sectionId: "section-2",
    questionEn: "Can I save my favourite combinations?",
    questionAr: "هل يمكنني حفظ تركيباتي المفضلة؟",
    answerEn: "Yes.\n\nSimply tap the ♡ icon on any design, fabric, or Ready to Order piece to add it to your Wishlist. Your saved favourites will be available anytime, making it easy to revisit them, compare your options, or continue creating your Mukhawar later.",
    answerAr: "نعم.\n\nما عليك سوى النقر على أيقونة ♡ على أي تصميم أو قماش أو قطعة جاهزة للطلب لإضافتها إلى قائمة رغباتك. ستكون مفضلاتك المحفوظة متاحة في أي وقت، مما يسهل العودة إليها أو مقارنة خياراتك أو مواصلة إنشاء مخوارك لاحقاً."
  },
  {
    id: "cm-13",
    sectionId: "section-2",
    questionEn: "Can I recreate a previous Mukhawar?",
    questionAr: "هل يمكنني إعادة إنشاء مخوار سابق؟",
    answerEn: "Yes.\n\nIf your previous design and fabric are still available, you can recreate the same Mukhawar with just a few clicks.\n\nYou can also keep the same design while selecting a different fabric, or pair your favourite fabric with a completely new design.",
    answerAr: "نعم.\n\nإذا كان تصميمك السابق وقماشك لا يزالان متاحين، يمكنك إعادة إنشاء نفس المخوار ببضع نقرات فقط.\n\nيمكنك أيضاً الاحتفاظ بنفس التصميم مع اختيار قماش مختلف، أو إقران قماشك المفضل بتصميم جديد تماماً."
  },
  {
    id: "cm-14",
    sectionId: "section-2",
    questionEn: "How often do you introduce new designs and fabrics?",
    questionAr: "كم مرة تقدمون تصاميم وأقمشة جديدة؟",
    answerEn: "We regularly introduce new designs, fabrics, and limited-edition collections throughout the year.\n\nCreate an account to stay up to date with our latest arrivals, and become a MOTD Member to unlock exclusive designs, early access to new drops, and other member-only benefits as you progress with us.",
    answerAr: "نقدم بانتظام تصاميم وأقمشة جديدة ومجموعات محدودة الإصدار على مدار العام.\n\nأنشئ حساباً للبقاء على اطلاع بأحدث الوافدين لدينا، وكن عضواً في MOTD لفتح التصاميم الحصرية والوصول المبكر إلى الإصدارات الجديدة والمزايا الأخرى للأعضاء فقط أثناء تقدمك معنا."
  },
  {
    id: "cm-15",
    sectionId: "section-2",
    questionEn: "How do I know if my design and fabric will look good together?",
    questionAr: "كيف أعرف إذا كان تصميمي وقماشي سيبدوان جيدين معاً؟",
    answerEn: "Every recommended combination on MOTD has been carefully curated by our team. If you choose your own combination, we'll review it before production begins. If we believe another fabric would better complement your chosen design, we'll share our recommendations with you before tailoring starts.\n\nThis is part of our commitment to delivering a Mukhawar you'll truly love.",
    answerAr: "كل تركيبة موصى بها على MOTD تم اختيارها بعناية من قبل فريقنا. إذا اخترت تركيبتك الخاصة، سنراجعها قبل بدء الإنتاج. إذا اعتقدنا أن قماشاً آخر سيكمل التصميم الذي اخترته بشكل أفضل، فسنشارك توصياتنا معك قبل بدء الخياطة.\n\nهذا جزء من التزامنا بتقديم مخوار ستحبينه حقاً."
  },
  {
    id: "cm-16",
    sectionId: "section-2",
    questionEn: "Will someone review my order before tailoring begins?",
    questionAr: "هل سيراجع أحدهم طلبي قبل بدء الخياطة؟",
    answerEn: "Yes.\n\nBefore production starts, your order is reviewed to ensure all selected details—including the design, fabric, measurements and tailoring requirements—are complete and ready for crafting.\n\nShould we notice anything that requires clarification, our Care Team will contact you before work begins.",
    answerAr: "نعم.\n\nقبل بدء الإنتاج، تتم مراجعة طلبك للتأكد من أن جميع التفاصيل المحددة - بما في ذلك التصميم والقماش والقياسات ومتطلبات الخياطة - مكتملة وجاهزة للتصنيع.\n\nإذا لاحظنا أي شيء يتطلب توضيحاً، سيتصل بك فريق الرعاية لدينا قبل بدء العمل."
  },

  // Section 3: Tailors & Measurements
  {
    id: "tm-1",
    sectionId: "section-3",
    questionEn: "How do I choose a tailor?",
    questionAr: "كيف أختار الخياط؟",
    answerEn: "Each tailoring partner on MOTD has their own expertise, signature finishing techniques and craftsmanship. You can browse their profile, learn more about their work and choose the tailor who best suits your style and preferences.",
    answerAr: "لكل شريك خياطة على MOTD خبرته الخاصة وتقنيات التشطيب المميزة والحرفية. يمكنك تصفح ملفهم الشخصي، ومعرفة المزيد عن عملهم، واختيار الخياط الذي يناسب أسلوبك وتفضيلاتك."
  },
  {
    id: "tm-2",
    sectionId: "section-3",
    questionEn: "How are MOTD tailors selected?",
    questionAr: "كيف يتم اختيار خياطي MOTD؟",
    answerEn: "Every tailoring partner is carefully chosen based on quality, craftsmanship, attention to detail and reliability. We work only with tailors who meet our quality standards and share our commitment to creating exceptional Mukhawars.",
    answerAr: "يتم اختيار كل شريك خياطة بعناية بناءً على الجودة والحرفية والاهتمام بالتفاصيل والموثوقية. نحن نعمل فقط مع الخياطين الذين يستوفون معايير الجودة لدينا ويشاركوننا الالتزام بإنشاء مخوارات استثنائية."
  },
  {
    id: "tm-3",
    sectionId: "section-3",
    questionEn: "Can I choose a different tailor for each order?",
    questionAr: "هل يمكنني اختيار خياط مختلف لكل طلب؟",
    answerEn: "Absolutely.\n\nYou're free to choose any available tailoring partner each time you create a new Mukhawar.\n\nMany customers enjoy exploring different tailoring styles and finishing techniques.",
    answerAr: "بالتأكيد.\n\nأنت حر في اختيار أي شريك خياطة متاح في كل مرة تنشئ فيها مخواراً جديداً.\n\nيستمتع العديد من العملاء باستكشاف أنماط الخياطة المختلفة وتقنيات التشطيب."
  },
  {
    id: "tm-4",
    sectionId: "section-3",
    questionEn: "Can I use my own tailor to stitch my Mukhawar?",
    questionAr: "هل يمكنني استخدام خياطي الخاص لخياطة المخوار الخاص بي؟",
    answerEn: "Yes.\n\nIf you prefer to use your own tailor, you can order your Mukhawar unstitched. Simply provide your preferred neck opening measurement during checkout, and we'll prepare your Mukhawar accordingly. Once you receive it, you can take it to your preferred tailor for stitching or gift it to someone else to have it tailored to their own measurements.",
    answerAr: "نعم.\n\nإذا كنت تفضل استخدام خياطك الخاص، يمكنك طلب المخوار غير مخيط. ما عليك سوى تقديم قياس فتحة الرقبة المفضل لديك أثناء الدفع، وسنقوم بتجهيز المخوار الخاص بك وفقاً لذلك. بمجرد استلامه، يمكنك أخذه إلى الخياط المفضل لديك للخياطة أو إهدائه لشخص آخر لتخصيصه حسب قياساته الخاصة."
  },
  {
    id: "tm-5",
    sectionId: "section-3",
    questionEn: "Can I contact the tailor directly?",
    questionAr: "هل يمكنني الاتصال بالخياط مباشرة؟",
    answerEn: "To ensure a smooth and consistent experience, all communication is managed through MOTD.\n\nOur Care Team coordinates directly with your tailoring partner on your behalf whenever needed.",
    answerAr: "لضمان تجربة سلسة ومتسقة، تتم إدارة جميع الاتصالات عبر MOTD.\n\nينسق فريق الرعاية لدينا مباشرة مع شريك الخياطة الخاص بك نيابة عنك كلما دعت الحاجة."
  },
  {
    id: "tm-6",
    sectionId: "section-3",
    questionEn: "Will my tailor see my personal information?",
    questionAr: "هل سيرى الخياط معلوماتي الشخصية؟",
    answerEn: "Your tailor only receives the information necessary to complete your order, including your selected design, fabric and measurements. Your personal information is handled securely in accordance with our Privacy Policy.",
    answerAr: "يتلقى الخياط فقط المعلومات اللازمة لإكمال طلبك، بما في ذلك التصميم والقماش والقياسات التي اخترتها. يتم التعامل مع معلوماتك الشخصية بشكل آمن وفقاً لسياسة الخصوصية الخاصة بنا."
  },
  {
    id: "tm-7",
    sectionId: "section-3",
    questionEn: "How do I submit my measurements?",
    questionAr: "كيف يمكنني تقديم قياساتي؟",
    answerEn: "You can enter your measurements during checkout by completing our step-by-step measurement guide.\n\nEach required measurement includes clear illustrations and instructions to help you measure accurately.",
    answerAr: "يمكنك إدخال قياساتك أثناء الدفع من خلال إكمال دليل القياسات خطوة بخطوة.\n\nيتضمن كل قياس مطلوب رسومات توضيحية وتعليمات واضحة لمساعدتك في القياس بدقة."
  },
  {
    id: "tm-8",
    sectionId: "section-3",
    questionEn: "Can I save my measurements?",
    questionAr: "هل يمكنني حفظ قياساتي؟",
    answerEn: "Yes.\n\nMOTD Members can securely save their measurement profiles for future orders, making it easy to create new Mukhawars without entering them each time.\n\nSimply create an account and become a MOTD Member to unlock this feature.",
    answerAr: "نعم.\n\nيمكن لأعضاء MOTD حفظ ملفات القياسات الخاصة بهم بشكل آمن للطلبات المستقبلية، مما يسهل إنشاء مخوارات جديدة دون إدخالها في كل مرة.\n\nما عليك سوى إنشاء حساب وتصبح عضواً في MOTD لفتح هذه الميزة."
  },
  {
    id: "tm-9",
    sectionId: "section-3",
    questionEn: "Can I save measurements for my family?",
    questionAr: "هل يمكنني حفظ قياسات لعائلتي؟",
    answerEn: "Yes.\n\nYour account can store multiple measurement profiles, making it easy to create Mukhawars for yourself, your daughters or other family members.\n\nEach profile can be given a custom name for easy identification.",
    answerAr: "نعم.\n\nيمكن لحسابك تخزين ملفات قياسات متعددة، مما يسهل إنشاء مخوارات لنفسك أو لبناتك أو لأفراد العائلة الآخرين.\n\nيمكن إعطاء كل ملف اسماً مخصصاً لسهولة التعرف عليه."
  },
  {
    id: "tm-10",
    sectionId: "section-3",
    questionEn: "How many measurement profiles can I save?",
    questionAr: "كم عدد ملفات القياسات التي يمكنني حفظها؟",
    answerEn: "You can save multiple measurement profiles within your MOTD account, allowing you to manage orders for different family members from one place.",
    answerAr: "يمكنك حفظ ملفات قياسات متعددة داخل حسابك في MOTD، مما يتيح لك إدارة الطلبات لأفراد العائلة المختلفين من مكان واحد."
  },
  {
    id: "tm-11",
    sectionId: "section-3",
    questionEn: "Can I edit my saved measurements?",
    questionAr: "هل يمكنني تعديل قياساتي المحفوظة؟",
    answerEn: "Yes.\n\nYour saved measurements can be updated at any time through your account before placing a new order.\n\nAny changes will only apply to future orders and will not affect orders already in production.",
    answerAr: "نعم.\n\nيمكن تحديث قياساتك المحفوظة في أي وقت من خلال حسابك قبل تقديم طلب جديد.\n\nأي تغييرات ستطبق فقط على الطلبات المستقبلية ولن تؤثر على الطلبات قيد الإنتاج بالفعل."
  },
  {
    id: "tm-12",
    sectionId: "section-3",
    questionEn: "What if I accidentally entered the wrong measurements?",
    questionAr: "ماذا لو أدخلت قياسات خاطئة عن طريق الخطأ؟",
    answerEn: "If you notice an error before tailoring begins, please contact care@motd.ae as soon as possible.\n\nWe'll do our best to update your measurements before production starts.\n\nOnce tailoring has begun, changes may no longer be possible.",
    answerAr: "إذا لاحظت خطأً قبل بدء الخياطة، يرجى الاتصال بـ care@motd.ae في أقرب وقت ممكن.\n\nسنبذل قصارى جهدنا لتحديث قياساتك قبل بدء الإنتاج.\n\nبمجرد بدء الخياطة، قد لا تكون التغييرات ممكنة."
  },
  {
    id: "tm-13",
    sectionId: "section-3",
    questionEn: "What happens if my measurements change over time?",
    questionAr: "ماذا يحدث إذا تغيرت قياساتي بمرور الوقت؟",
    answerEn: "Simply update your saved measurement profile before creating your next Mukhawar. We recommend reviewing your measurements regularly to ensure the best possible fit.",
    answerAr: "ما عليك سوى تحديث ملف القياسات المحفوظ قبل إنشاء المخوار التالي. نوصي بمراجعة قياساتك بانتظام لضمان أفضل مقاس ممكن."
  },
  {
    id: "tm-14",
    sectionId: "section-3",
    questionEn: "What if I'm unsure how to measure myself?",
    questionAr: "ماذا لو كنت غير متأكد من كيفية قياس نفسي؟",
    answerEn: "Don't worry.\n\nOur measurement guide includes detailed illustrations and helpful tips to walk you through every measurement step.\n\nIf you still need assistance, our Care Team will be happy to help.",
    answerAr: "لا تقلقي.\n\nيتضمن دليل القياسات رسومات توضيحية مفصلة ونصائح مفيدة لإرشادك خلال كل خطوة قياس.\n\nإذا كنت لا تزال بحاجة إلى مساعدة، سيسعد فريق الرعاية لدينا بمساعدتك."
  },
  {
    id: "tm-15",
    sectionId: "section-3",
    questionEn: "Are my measurements kept private?",
    questionAr: "هل يتم الاحتفاظ بقياساتي بشكل خاص؟",
    answerEn: "Yes.\n\nYour measurements are securely stored within your MOTD account and are only shared with your selected tailoring partner for the purpose of completing your order.",
    answerAr: "نعم.\n\nيتم تخزين قياساتك بشكل آمن داخل حسابك في MOTD ولا يتم مشاركتها إلا مع شريك الخياطة الذي اخترته لغرض إكمال طلبك."
  },
  {
    id: "tm-16",
    sectionId: "section-3",
    questionEn: "How accurate do my measurements need to be?",
    questionAr: "ما مدى دقة قياساتي؟",
    answerEn: "Accurate measurements are essential to achieving the best possible fit.\n\nWe recommend measuring carefully using a soft measuring tape and following our illustrated guide.\n\nIf you're unsure, it's always better to double-check before submitting.",
    answerAr: "القياسات الدقيقة ضرورية لتحقيق أفضل مقاس ممكن.\n\nنوصي بالقياس بعناية باستخدام شريط قياس ناعم واتباع دليلنا المصور.\n\nإذا كنت غير متأكد، فمن الأفضل دائماً التحقق مرة أخرى قبل التقديم."
  },
  {
    id: "tm-17",
    sectionId: "section-3",
    questionEn: "Can I add notes for the tailor?",
    questionAr: "هل يمكنني إضافة ملاحظات للخياط؟",
    answerEn: "Yes.\n\nDuring checkout, you'll have the opportunity to include additional notes or preferences related to your order.\n\nOur team will review these instructions before production begins.",
    answerAr: "نعم.\n\nأثناء الدفع، ستتاح لك الفرصة لتضمين ملاحظات إضافية أو تفضيلات متعلقة بطلبك.\n\nسيراجع فريقنا هذه التعليمات قبل بدء الإنتاج."
  },

  // Section 4: Orders & Your Creation Journey
  {
    id: "oj-1",
    sectionId: "section-4",
    questionEn: "What happens after I place my order?",
    questionAr: "ماذا يحدث بعد تقديم طلبي؟",
    answerEn: "Once your order is confirmed, MOTD begins coordinating every stage of your Mukhawar's creation.\n\nYour order is reviewed, your selected fabric and tailor are confirmed, and production begins once everything is ready.\n\nYou'll receive updates throughout your Mukhawar's journey until it arrives at your doorstep.",
    answerAr: "بمجرد تأكيد طلبك، تبدأ MOTD في تنسيق كل مرحلة من مراحل إنشاء المخوار الخاص بك.\n\nتتم مراجعة طلبك، وتأكيد القماش والخياط اللذين اخترتهما، ويبدأ الإنتاج بمجرد أن يكون كل شيء جاهزاً.\n\nستتلقى تحديثات طوال رحلة المخوار الخاص بك حتى يصل إلى باب منزلك."
  },
  {
    id: "oj-2",
    sectionId: "section-4",
    questionEn: "How will I track my custom Mukhawar order?",
    questionAr: "كيف سأتتبع طلب المخوار المخصص الخاص بي؟",
    answerEn: "Your order follows a carefully managed journey:\n1. Order Confirmed\n2. Fabric Dispatched or Scheduled for Collection*\n3. Fabric Received by Tailor\n4. Tailoring in Progress\n5. Ready for Dispatch\n6. Out for Delivery\n7. Delivered\n\nYou'll be notified as your order progresses through each stage.\n\n* Depending on whether you purchase fabric through MOTD or choose to provide your own.",
    answerAr: "يتبع طلبك رحلة مُدارة بعناية:\n1. تأكيد الطلب\n2. شحن القماش أو جدولة الاستلام*\n3. استلام القماش من قبل الخياط\n4. الخياطة قيد التقدم\n5. جاهز للشحن\n6. جاري التوصيل\n7. تم التوصيل\n\nسيتم إعلامك بتقدم طلبك خلال كل مرحلة.\n\n* حسب ما إذا كنت تشتري القماش عبر MOTD أو تختار توفير قماشك الخاص."
  },
  {
    id: "oj-3",
    sectionId: "section-4",
    questionEn: "Can I track my order?",
    questionAr: "هل يمكنني تتبع طلبي؟",
    answerEn: "Yes.\n\nYou can track your order anytime by logging into your MOTD account, where you'll be able to view its latest status and follow its progress from start to finish.",
    answerAr: "نعم.\n\nيمكنك تتبع طلبك في أي وقت عن طريق تسجيل الدخول إلى حسابك في MOTD، حيث ستتمكن من عرض أحدث حالة له ومتابعة تقدمه من البداية إلى النهاية."
  },
  {
    id: "oj-4",
    sectionId: "section-4",
    questionEn: "Can I change my order after placing it?",
    questionAr: "هل يمكنني تغيير طلبي بعد تقديمه؟",
    answerEn: "If tailoring has not yet begun, we'll do our best to accommodate your request.\n\nPlease contact care@motd.ae as soon as possible.\n\nOnce production has started, changes may no longer be possible.",
    answerAr: "إذا لم تبدأ الخياطة بعد، سنبذل قصارى جهدنا لتلبية طلبك.\n\nيرجى الاتصال بـ care@motd.ae في أقرب وقت ممكن.\n\nبمجرد بدء الإنتاج، قد لا تكون التغييرات ممكنة."
  },
  {
    id: "oj-5",
    sectionId: "section-4",
    questionEn: "Can I make changes to my order after it's been placed?",
    questionAr: "هل يمكنني إجراء تغييرات على طلبي بعد تقديمه؟",
    answerEn: "Changes to your measurements, fabric, or other order details may be possible if production has not yet begun.\n\nPlease contact our Care Team as soon as possible, and we'll review your request.\n\nOnce production has started, changes may no longer be possible.",
    answerAr: "قد تكون التغييرات على قياساتك أو قماشك أو تفاصيل الطلب الأخرى ممكنة إذا لم يبدأ الإنتاج بعد.\n\nيرجى الاتصال بفريق الرعاية لدينا في أقرب وقت ممكن، وسنراجع طلبك.\n\nبمجرد بدء الإنتاج، قد لا تكون التغييرات ممكنة."
  },
  {
    id: "oj-6",
    sectionId: "section-4",
    questionEn: "Can I cancel my order?",
    questionAr: "هل يمكنني إلغاء طلبي؟",
    answerEn: "Orders may be cancelled before tailoring begins.\n\nOnce production has started, customised orders cannot usually be cancelled because work has already commenced on your Mukhawar.\n\nPlease refer to our Returns & Refund Policy for further information.",
    answerAr: "يمكن إلغاء الطلبات قبل بدء الخياطة.\n\nبمجرد بدء الإنتاج، لا يمكن عادةً إلغاء الطلبات المخصصة لأن العمل قد بدأ بالفعل على المخوار الخاص بك.\n\nيرجى الرجوع إلى سياسة الإرجاع والاسترداد الخاصة بنا لمزيد من المعلومات."
  },
  {
    id: "oj-7",
    sectionId: "section-4",
    questionEn: "How long does it take to create a Mukhawar?",
    questionAr: "كم من الوقت يستغرق إنشاء مخوار؟",
    answerEn: "Production times vary depending on the design, fabric and tailoring partner.\n\nAn estimated production timeline will be displayed before you complete your order.",
    answerAr: "تختلف أوقات الإنتاج حسب التصميم والقماش وشريك الخياطة.\n\nسيتم عرض الجدول الزمني التقديري للإنتاج قبل إكمال طلبك."
  },
  {
    id: "oj-8",
    sectionId: "section-4",
    questionEn: "Can I order more than one Mukhawar at the same time?",
    questionAr: "هل يمكنني طلب أكثر من مخوار في نفس الوقت؟",
    answerEn: "Absolutely.\n\nYou may create as many Mukhawars as you'd like in a single order.\n\nEach piece can have its own design, fabric, tailor and measurement profile.",
    answerAr: "بالتأكيد.\n\nيمكنك إنشاء أي عدد تريده من المخوارات في طلب واحد.\n\nيمكن أن يكون لكل قطعة تصميمها وقماشها وخياطها وملف قياسات خاص بها."
  },
  {
    id: "oj-9",
    sectionId: "section-4",
    questionEn: "Can I reorder a previous creation?",
    questionAr: "هل يمكنني إعادة طلب إبداع سابق؟",
    answerEn: "Yes.\n\nYour previous creations are saved within your account, making it easy to recreate a favourite Mukhawar or use it as inspiration for a new one.",
    answerAr: "نعم.\n\nيتم حفظ إبداعاتك السابقة داخل حسابك، مما يسهل إعادة إنشاء مخوار مفضل أو استخدامه كإلهام لمخوار جديد."
  },
  {
    id: "oj-10",
    sectionId: "section-4",
    questionEn: "Will I see the exact completion date?",
    questionAr: "هل سأرى تاريخ الانتهاء الدقيق؟",
    answerEn: "Your order page will display an estimated completion and delivery date based on your selected tailor.",
    answerAr: "ستعرض صفحة طلبك تاريخ الانتهاء والتوصيل التقديري بناءً على الخياط الذي اخترته."
  },
  {
    id: "oj-11",
    sectionId: "section-4",
    questionEn: "What happens if my tailor experiences an unexpected delay?",
    questionAr: "ماذا يحدث إذا واجه خياطي تأخيراً غير متوقع؟",
    answerEn: "If an unexpected delay occurs, we'll notify you as soon as possible and keep you updated on the revised timeline.\n\nOur Care Team will always work to minimise delays and ensure your Mukhawar is completed to the highest standard.",
    answerAr: "في حالة حدوث تأخير غير متوقع، سنخطرك في أقرب وقت ممكن ونبقيك على اطلاع على الجدول الزمني المعدل.\n\nسيعمل فريق الرعاية لدينا دائماً على تقليل التأخير وضمان اكتمال المخوار الخاص بك بأعلى مستوى."
  },
  {
    id: "oj-12",
    sectionId: "section-4",
    questionEn: "Can I order a Mukhawar as a gift?",
    questionAr: "هل يمكنني طلب مخوار كهدية؟",
    answerEn: "Yes.\n\nYou can order a custom Mukhawar using the recipient's measurements or, if you're unsure, order it unstitched by providing an estimated neck opening measurement at checkout page. You can also choose from our Ready to Order collection for a gift that's ready to stitch or ready to wear.",
    answerAr: "نعم.\n\nيمكنك طلب مخوار مخصص باستخدام قياسات المستلم، أو إذا كنت غير متأكد، اطلبه غير مخيط من خلال تقديم قياس فتحة الرقبة التقديري في صفحة الدفع. يمكنك أيضاً الاختيار من مجموعتنا الجاهزة للطلب للحصول على هدية جاهزة للخياطة أو جاهزة للارتداء."
  },
  {
    id: "oj-13",
    sectionId: "section-4",
    questionEn: "Can I save my creation before ordering?",
    questionAr: "هل يمكنني حفظ إبداعي قبل الطلب؟",
    answerEn: "Yes.\n\nSimply add your creation to your Cart or save it to your Wishlist, and you can return to it whenever you're ready to complete your order.",
    answerAr: "نعم.\n\nما عليك سوى إضافة إبداعك إلى سلة التسوق أو حفظه في قائمة رغباتك، ويمكنك العودة إليه في أي وقت تكون فيه مستعداً لإكمال طلبك."
  },
  {
    id: "oj-14",
    sectionId: "section-4",
    questionEn: "Can I share a design or fabric with someone before ordering?",
    questionAr: "هل يمكنني مشاركة تصميم أو قماش مع شخص ما قبل الطلب؟",
    answerEn: "Yes.\n\nSimply tap the Share icon on any design, fabric, or Ready to Order piece to send it through your preferred app and share it with family and friends.",
    answerAr: "نعم.\n\nما عليك سوى النقر على أيقونة المشاركة على أي تصميم أو قماش أو قطعة جاهزة للطلب لإرسالها عبر التطبيق المفضل لديك ومشاركتها مع العائلة والأصدقاء."
  },
  {
    id: "oj-15",
    sectionId: "section-4",
    questionEn: "Can I see my complete order history?",
    questionAr: "هل يمكنني رؤية سجل طلباتي الكامل؟",
    answerEn: "Yes.\n\nYour MOTD account keeps a record of all your previous creations, making it easy to reorder favourites, track past purchases and revisit your personal style over time.",
    answerAr: "نعم.\n\nيحتفظ حسابك في MOTD بسجل لجميع إبداعاتك السابقة، مما يسهل إعادة طلب المفضلات، وتتبع المشتريات السابقة، وإعادة زيارة أسلوبك الشخصي بمرور الوقت."
  },
  {
    id: "oj-16",
    sectionId: "section-4",
    questionEn: "What makes the MOTD ordering experience different?",
    questionAr: "ما الذي يجعل تجربة الطلب من MOTD مختلفة؟",
    answerEn: "MOTD brings designs, fabrics, tailors, and delivery together in one seamless experience.\n\nWhether you're creating a custom Mukhawar, shopping for fabrics, or choosing a Ready to Order piece, MOTD manages every step—from your first selection to delivery—making the process simple, convenient, and enjoyable.",
    answerAr: "تجمع MOTD التصاميم والأقمشة والخياطين والتوصيل في تجربة سلسة واحدة.\n\nسواء كنت تنشئ مخواراً مخصصاً، أو تتسوق للأقمشة، أو تختار قطعة جاهزة للطلب، تدير MOTD كل خطوة - من اختيارك الأول إلى التوصيل - مما يجعل العملية بسيطة ومريحة وممتعة."
  },

  // Section 5: Delivery & Returns
  {
    id: "dr-1",
    sectionId: "section-5",
    questionEn: "Where does MOTD deliver?",
    questionAr: "إلى أين توصل MOTD؟",
    answerEn: "We currently deliver throughout the United Arab Emirates only.",
    answerAr: "نحن نوصل حالياً في جميع أنحاء دولة الإمارات العربية المتحدة فقط."
  },
  {
    id: "dr-2",
    sectionId: "section-5",
    questionEn: "How much does delivery cost?",
    questionAr: "كم تكلفة التوصيل؟",
    answerEn: "Delivery charges are calculated during checkout based on your delivery address and the contents of your order.\n\nThe final delivery fee will always be displayed before payment.",
    answerAr: "يتم حساب رسوم التوصيل أثناء الدفع بناءً على عنوان التوصيل ومحتويات طلبك.\n\nسيتم دائماً عرض رسوم التوصيل النهائية قبل الدفع."
  },
  {
    id: "dr-3",
    sectionId: "section-5",
    questionEn: "How long does delivery take?",
    questionAr: "كم من الوقت يستغرق التوصيل؟",
    answerEn: "Delivery times depend on your location and whether your order is a Ready to Order item or a Made to Order Mukhawar. Estimated delivery dates are shown during checkout and in your order confirmation.",
    answerAr: "تعتمد أوقات التوصيل على موقعك وما إذا كان طلبك قطعة جاهزة للطلب أو مخواراً مصنوعاً حسب الطلب. تظهر تواريخ التوصيل التقديرية أثناء الدفع وفي تأكيد طلبك."
  },
  {
    id: "dr-4",
    sectionId: "section-5",
    questionEn: "Can I track my delivery?",
    questionAr: "هل يمكنني تتبع شحنتي؟",
    answerEn: "Yes.\n\nOnce your order has been dispatched, you'll receive tracking information so you can follow your delivery in real time.",
    answerAr: "نعم.\n\nبمجرد شحن طلبك، ستتلقى معلومات التتبع لتتمكن من متابعة شحنتك في الوقت الفعلي."
  },
  {
    id: "dr-5",
    sectionId: "section-5",
    questionEn: "Will I be notified before delivery?",
    questionAr: "هل سيتم إخطاري قبل التوصيل؟",
    answerEn: "Yes.\n\nWe'll notify you when your order has been dispatched and provide delivery updates until it reaches you.",
    answerAr: "نعم.\n\nسنخطرك عند شحن طلبك ونقدم تحديثات التوصيل حتى يصل إليك."
  },
  {
    id: "dr-6",
    sectionId: "section-5",
    questionEn: "Can someone else receive my order?",
    questionAr: "هل يمكن لشخص آخر استلام طلبي؟",
    answerEn: "Yes.\n\nIf someone else will be receiving your order, please ensure they're available at the delivery address and able to accept the package on your behalf.",
    answerAr: "نعم.\n\nإذا كان شخص آخر سيتسلم طلبك، يرجى التأكد من أنه متواجد في عنوان التوصيل وقادر على استلام الطرد نيابة عنك."
  },
  {
    id: "dr-7",
    sectionId: "section-5",
    questionEn: "Can I change my delivery address after placing my order?",
    questionAr: "هل يمكنني تغيير عنوان التوصيل بعد تقديم طلبي؟",
    answerEn: "If your order has not yet been dispatched, we'll do our best to update your delivery address.\n\nPlease contact care@motd.ae as soon as possible. You may also contact us through WhatsApp live chat at @MOTDae (+971569722533), Monday to Thursday, during business hours, 10:00 AM to 17:00 PM (UAE time).",
    answerAr: "إذا لم يتم شحن طلبك بعد، سنبذل قصارى جهدنا لتحديث عنوان التوصيل الخاص بك.\n\nيرجى الاتصال بـ care@motd.ae في أقرب وقت ممكن. يمكنك أيضاً التواصل معنا عبر الدردشة المباشرة على واتساب على @MOTDae (+971569722533)، من الاثنين إلى الخميس، خلال ساعات العمل، من 10:00 صباحاً إلى 5:00 مساءً (بتوقيت الإمارات)."
  },
  {
    id: "dr-8",
    sectionId: "section-5",
    questionEn: "What happens if I'm not available during delivery?",
    questionAr: "ماذا يحدث إذا لم أكن متاحاً أثناء التوصيل؟",
    answerEn: "Our delivery partner will normally attempt to contact you and arrange another delivery attempt according to their delivery policy.",
    answerAr: "سيتصل بك شريك التوصيل عادةً ويرتب محاولة توصيل أخرى وفقاً لسياسة التوصيل الخاصة به."
  },
  {
    id: "dr-9",
    sectionId: "section-5",
    questionEn: "Can I return my Mukhawar?",
    questionAr: "هل يمكنني إرجاع المخوار الخاص بي؟",
    answerEn: "Made-to-order Mukhawars tailored to your individual measurements cannot be returned or refunded, except if the item arrives damaged or incorrect.\n\nReady to Order items may be eligible for return in accordance with our Returns Policy.",
    answerAr: "لا يمكن إرجاع أو استرداد المخوارات المصنوعة حسب الطلب والمفصلة وفقاً لقياساتك الفردية، إلا إذا وصل العنصر تالفاً أو غير صحيح.\n\nقد تكون العناصر الجاهزة للطلب مؤهلة للإرجاع وفقاً لسياسة الإرجاع الخاصة بنا."
  },
  {
    id: "dr-10",
    sectionId: "section-5",
    questionEn: "Why can't customised Mukhawars be returned?",
    questionAr: "لماذا لا يمكن إرجاع المخوارات المخصصة؟",
    answerEn: "Each customised Mukhawar is created exclusively for you using your chosen design, fabric and measurements.\n\nBecause it has been tailored specifically to your requirements, it cannot be resold to another customer.",
    answerAr: "يتم إنشاء كل مخوار مخصص حصرياً لك باستخدام التصميم والقماش والقياسات التي اخترتها.\n\nنظراً لأنه تم تفصيله خصيصاً وفقاً لمتطلباتك، فلا يمكن إعادة بيعه لعميل آخر."
  },
  {
    id: "dr-11",
    sectionId: "section-5",
    questionEn: "Which items can be returned?",
    questionAr: "ما هي العناصر التي يمكن إرجاعها؟",
    answerEn: "Eligible Ready to Order items may be returned within 30 days of delivery, provided they are:\n• Unworn\n• Unwashed\n• Unaltered\n• In their original condition\n• Returned with all original packaging",
    answerAr: "يمكن إرجاع العناصر الجاهزة للطلب المؤهلة في غضون 30 يوماً من التوصيل، بشرط أن تكون:\n• غير مرتدية\n• غير مغسولة\n• غير معدلة\n• في حالتها الأصلية\n• مع إرجاع جميع العبوات الأصلية"
  },
  {
    id: "dr-12",
    sectionId: "section-5",
    questionEn: "Can fabric be returned?",
    questionAr: "هل يمكن إرجاع القماش؟",
    answerEn: "Unused standard fabric may be eligible for return in accordance with our Returns Policy.",
    answerAr: "قد يكون القماش القياسي غير المستخدم مؤهلاً للإرجاع وفقاً لسياسة الإرجاع الخاصة بنا."
  },
  {
    id: "dr-13",
    sectionId: "section-5",
    questionEn: "How do I request a return?",
    questionAr: "كيف يمكنني طلب الإرجاع؟",
    answerEn: "If your order is eligible for return, you can submit a return request directly from your order details within 30 days of delivery by selecting Request a Return.\n\nWe'll arrange the return, and once the item has been received and inspected, we'll confirm your refund.",
    answerAr: "إذا كان طلبك مؤهلاً للإرجاع، يمكنك تقديم طلب إرجاع مباشرة من تفاصيل طلبك في غضون 30 يوماً من التوصيل عن طريق تحديد طلب إرجاع.\n\nسنرتب الإرجاع، وبمجرد استلام العنصر وفحصه، سنؤكد استردادك."
  },
  {
    id: "dr-14",
    sectionId: "section-5",
    questionEn: "How long do refunds take?",
    questionAr: "كم من الوقت يستغرق استرداد المبلغ؟",
    answerEn: "Once your returned item has been received and approved, refunds are usually processed within 7–14 business days back to your original payment method.",
    answerAr: "بمجرد استلام العنصر المرتجع والموافقة عليه، تتم معالجة استردادات المبلغ عادةً في غضون 7-14 يوم عمل إلى طريقة الدفع الأصلية الخاصة بك."
  },
  {
    id: "dr-15",
    sectionId: "section-5",
    questionEn: "What if I receive the wrong item?",
    questionAr: "ماذا لو تلقيت العنصر الخطأ؟",
    answerEn: "If you receive the wrong item, please contact our Care Team within 48 hours of delivery by email or WhatsApp and include clear photographs of the item. We'll review the issue and arrange the appropriate solution as quickly as possible.",
    answerAr: "إذا تلقيت العنصر الخطأ، يرجى الاتصال بفريق الرعاية لدينا في غضون 48 ساعة من التوصيل عبر البريد الإلكتروني أو واتساب وتضمين صور واضحة للعنصر. سنراجع المشكلة ونرتب الحل المناسب في أسرع وقت ممكن."
  },
  {
    id: "dr-16",
    sectionId: "section-5",
    questionEn: "What if my order arrives damaged?",
    questionAr: "ماذا لو وصل طلبي تالفاً؟",
    answerEn: "If your order arrives damaged during delivery, please contact us within 48 hours of delivery by email or WhatsApp and include photographs of both the packaging and the item. We'll investigate the issue and work with you to resolve it promptly.",
    answerAr: "إذا وصل طلبك تالفاً أثناء التوصيل، يرجى الاتصال بنا في غضون 48 ساعة من التوصيل عبر البريد الإلكتروني أو واتساب وتضمين صور لكل من العبوة والعنصر. سنحقق في المشكلة ونعمل معك لحلها على الفور."
  },
  {
    id: "dr-17",
    sectionId: "section-5",
    questionEn: "What if a product is missing from my order?",
    questionAr: "ماذا لو كان منتج مفقوداً من طلبي؟",
    answerEn: "If anything appears to be missing, please contact our Care Team within 48 hours of delivery by email or WhatsApp. We'll review your order and arrange any necessary follow-up.",
    answerAr: "إذا كان هناك أي شيء مفقود، يرجى الاتصال بفريق الرعاية لدينا في غضون 48 ساعة من التوصيل عبر البريد الإلكتروني أو واتساب. سنراجع طلبك ونرتب أي متابعة ضرورية."
  },

  // Section 6: Payments & Your MOTD Account
  {
    id: "pa-1",
    sectionId: "section-6",
    questionEn: "Which payment methods do you accept?",
    questionAr: "ما هي طرق الدفع التي تقبلونها؟",
    answerEn: "MOTD accepts major debit and credit cards, including Visa and Mastercard, as well as Apple Pay. Additional payment methods available at checkout will be displayed during the payment process.",
    answerAr: "تقبل MOTD بطاقات الخصم والائتمان الرئيسية، بما في ذلك فيزا وماستركارد، بالإضافة إلى Apple Pay. سيتم عرض طرق الدفع الإضافية المتاحة عند الدفع أثناء عملية الدفع."
  },
  {
    id: "pa-2",
    sectionId: "section-6",
    questionEn: "Do you accept Cash on Delivery (COD)?",
    questionAr: "هل تقبلون الدفع عند الاستلام؟",
    answerEn: "At this time, MOTD does not offer Cash on Delivery.\n\nAll orders must be paid online before production begins.\n\nThis allows us to confirm your order immediately and begin creating your Mukhawar without delay.",
    answerAr: "في الوقت الحالي، لا تقدم MOTD خدمة الدفع عند الاستلام.\n\nيجب دفع جميع الطلبات عبر الإنترنت قبل بدء الإنتاج.\n\nهذا يسمح لنا بتأكيد طلبك فوراً والبدء في إنشاء المخوار الخاص بك دون تأخير."
  },
  {
    id: "pa-3",
    sectionId: "section-6",
    questionEn: "Is my payment secure?",
    questionAr: "هل مدفوعاتي آمنة؟",
    answerEn: "Yes.\n\nAll payments are processed through secure, encrypted payment gateways that meet industry security standards.\n\nMOTD does not store your full payment card details.",
    answerAr: "نعم.\n\nتتم معالجة جميع المدفوعات من خلال بوابات دفع آمنة ومشفرة تلبي معايير الأمان الصناعية.\n\nلا تقوم MOTD بتخزين تفاصيل بطاقة الدفع الكاملة الخاصة بك."
  },
  {
    id: "pa-4",
    sectionId: "section-6",
    questionEn: "When will my payment be charged?",
    questionAr: "متى سيتم خصم مدفوعاتي؟",
    answerEn: "Payment is collected at the time your order is placed.\n\nOnce your payment has been successfully processed, you'll receive an order confirmation by email.",
    answerAr: "يتم تحصيل الدفع في وقت تقديم طلبك.\n\nبمجرد معالجة دفعتك بنجاح، ستتلقى تأكيداً بالطلب عبر البريد الإلكتروني."
  },
  {
    id: "pa-5",
    sectionId: "section-6",
    questionEn: "Can I pay in instalments?",
    questionAr: "هل يمكنني الدفع بالتقسيط؟",
    answerEn: "Installment payment options may be available through selected payment providers at checkout.",
    answerAr: "قد تكون خيارات الدفع بالتقسيط متاحة من خلال مزودي الدفع المختارين عند الدفع."
  },
  {
    id: "pa-6",
    sectionId: "section-6",
    questionEn: "Can I save my payment card for future purchases?",
    questionAr: "هل يمكنني حفظ بطاقة الدفع الخاصة بي للمشتريات المستقبلية؟",
    answerEn: "If available, you may securely save your preferred payment method for faster checkout.\n\nPayment information is stored securely by our payment provider—not by MOTD.",
    answerAr: "إذا كان متاحاً، يمكنك حفظ طريقة الدفع المفضلة لديك بشكل آمن لإتمام الدفع بشكل أسرع.\n\nيتم تخزين معلومات الدفع بشكل آمن من قبل مزود الدفع لدينا - وليس بواسطة MOTD."
  },
  {
    id: "pa-7",
    sectionId: "section-6",
    questionEn: "Can I use a discount code?",
    questionAr: "هل يمكنني استخدام رمز خصم؟",
    answerEn: "Yes.\n\nIf you have a valid promotional code, you can enter it during checkout before completing your payment.\n\nAny eligible discount will be applied automatically.",
    answerAr: "نعم.\n\nإذا كان لديك رمز ترويجي صالح، يمكنك إدخاله أثناء الدفع قبل إتمام عملية الدفع.\n\nسيتم تطبيق أي خصم مؤهل تلقائياً."
  },
  {
    id: "pa-8",
    sectionId: "section-6",
    questionEn: "Can I use more than one promo code?",
    questionAr: "هل يمكنني استخدام أكثر من رمز ترويجي؟",
    answerEn: "Unless otherwise stated, only one promotional code can be used per order.",
    answerAr: "ما لم يُنص على خلاف ذلك، يمكن استخدام رمز ترويجي واحد فقط لكل طلب."
  },
  {
    id: "pa-9",
    sectionId: "section-6",
    questionEn: "Why isn't my promo code working?",
    questionAr: "لماذا لا يعمل رمز الترويج الخاص بي؟",
    answerEn: "A promotional code may not work if:\n• It has expired.\n• Minimum purchase requirements haven't been met.\n• It only applies to selected products.\n• It has already been used.\n• Another promotion has already been applied.\n\nIf you believe your code should be valid, please contact care@motd.ae.",
    answerAr: "قد لا يعمل رمز الترويج إذا:\n• انتهت صلاحيته.\n• لم يتم استيفاء الحد الأدنى لمتطلبات الشراء.\n• ينطبق فقط على منتجات محددة.\n• تم استخدامه بالفعل.\n• تم تطبيق عرض ترويجي آخر بالفعل.\n\nإذا كنت تعتقد أن رمزك يجب أن يكون صالحاً، يرجى الاتصال بـ care@motd.ae."
  },
  {
    id: "pa-10",
    sectionId: "section-6",
    questionEn: "Why should I create a MOTD account?",
    questionAr: "لماذا يجب عليّ إنشاء حساب MOTD؟",
    answerEn: "Creating an account allows you to:\n• Save your measurements.\n• Save multiple family profiles.\n• Save favourite designs and fabrics.\n• Track your orders.\n• Reorder previous creations.\n• Manage your addresses.\n• Enjoy a faster checkout experience.",
    answerAr: "يتيح لك إنشاء حساب:\n• حفظ قياساتك.\n• حفظ ملفات متعددة لأفراد العائلة.\n• حفظ التصاميم والأقمشة المفضلة.\n• تتبع طلباتك.\n• إعادة طلب الإبداعات السابقة.\n• إدارة عناوينك.\n• الاستمتاع بتجربة دفع أسرع."
  },
  {
    id: "pa-11",
    sectionId: "section-6",
    questionEn: "What is My Wardrobe?",
    questionAr: "ما هي خزانة ملابسي؟",
    answerEn: "My Wardrobe is your personal space within MOTD.\n\nHere you'll find everything you've saved and ordered in one beautifully organised place.",
    answerAr: "خزانة ملابسي هي مساحتك الشخصية داخل MOTD.\n\nستجد هنا كل ما حفظته وطلبته في مكان واحد منظم بشكل جميل."
  },
  {
    id: "pa-12",
    sectionId: "section-6",
    questionEn: "What can I find inside My Wardrobe?",
    questionAr: "ماذا يمكنني أن أجد داخل خزانة ملابسي؟",
    answerEn: "My Wardrobe includes:\n• Saved Designs\n• Saved Fabrics\n• Measurement Profiles\n• Order History\n• Saved Addresses\n• Account Settings\n• Wishlist",
    answerAr: "تتضمن خزانة ملابسي:\n• التصاميم المحفوظة\n• الأقمشة المحفوظة\n• ملفات القياسات\n• سجل الطلبات\n• العناوين المحفوظة\n• إعدادات الحساب\n• قائمة الرغبات"
  },
  {
    id: "pa-13",
    sectionId: "section-6",
    questionEn: "Can I save designs or fabrics without purchasing them?",
    questionAr: "هل يمكنني حفظ التصاميم أو الأقمشة دون شرائها؟",
    answerEn: "Yes.\n\nSimply tap the ♡ icon on any design, fabric, or Ready to Order piece to add it to your Wishlist. You can revisit your saved favourites anytime and continue whenever you're ready.",
    answerAr: "نعم.\n\nما عليك سوى النقر على أيقونة ♡ على أي تصميم أو قماش أو قطعة جاهزة للطلب لإضافتها إلى قائمة رغباتك. يمكنك العودة إلى مفضلاتك المحفوظة في أي وقت والمتابعة عندما تكون مستعداً."
  },
  {
    id: "pa-14",
    sectionId: "section-6",
    questionEn: "Can I save complete Mukhawar ideas?",
    questionAr: "هل يمكنني حفظ أفكار مخوار كاملة؟",
    answerEn: "Yes.\n\nOnce you've created your Mukhawar, you can save it to your Cart or Wishlist and return to it whenever you're ready to place your order.",
    answerAr: "نعم.\n\nبمجرد إنشاء المخوار الخاص بك، يمكنك حفظه في سلة التسوق أو قائمة الرغبات والعودة إليه في أي وقت تكون فيه مستعداً لتقديم طلبك."
  },
  {
    id: "pa-15",
    sectionId: "section-6",
    questionEn: "Can I duplicate a previous creation?",
    questionAr: "هل يمكنني نسخ إبداع سابق؟",
    answerEn: "Absolutely.\n\nYou can duplicate any previous creation and make changes such as selecting a different fabric or design without starting again from the beginning.",
    answerAr: "بالتأكيد.\n\nيمكنك نسخ أي إبداع سابق وإجراء تغييرات مثل اختيار قماش أو تصميم مختلف دون البدء من جديد."
  },
  {
    id: "pa-16",
    sectionId: "section-6",
    questionEn: "Can I change my email address or phone number?",
    questionAr: "هل يمكنني تغيير عنوان بريدي الإلكتروني أو رقم هاتفي؟",
    answerEn: "Yes.\n\nYour contact information can be updated anytime through your Account Settings.",
    answerAr: "نعم.\n\nيمكن تحديث معلومات الاتصال الخاصة بك في أي وقت من خلال إعدادات الحساب."
  },
  {
    id: "pa-17",
    sectionId: "section-6",
    questionEn: "I forgot my password. What should I do?",
    questionAr: "نسيت كلمة المرور الخاصة بي. ماذا أفعل؟",
    answerEn: "Select Forgot Password on the sign-in page and follow the instructions to securely reset your password.",
    answerAr: "حدد نسيت كلمة المرور على صفحة تسجيل الدخول واتبع التعليمات لإعادة تعيين كلمة المرور الخاصة بك بشكل آمن."
  },
  {
    id: "pa-18",
    sectionId: "section-6",
    questionEn: "How does MOTD protect my personal information?",
    questionAr: "كيف تحمي MOTD معلوماتي الشخصية؟",
    answerEn: "Your privacy is important to us.\n\nPersonal information is securely stored and only used to process your orders and improve your experience with MOTD.\n\nPlease refer to our Privacy Policy for full details.",
    answerAr: "خصوصيتك مهمة بالنسبة لنا.\n\nيتم تخزين المعلومات الشخصية بشكل آمن واستخدامها فقط لمعالجة طلباتك وتحسين تجربتك مع MOTD.\n\nيرجى الرجوع إلى سياسة الخصوصية الخاصة بنا للحصول على التفاصيل الكاملة."
  }
];

export default function MOTDGuidePage() {
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("section-1");

  const sectionsContainerRef = useRef<HTMLDivElement>(null);

  const SECTIONS = [
    { id: "section-1", titleEn: "Getting Started", titleAr: "دليل البداية", icon: Sparkles },
    { id: "section-2", titleEn: "Creating Your Mukhawar", titleAr: "تفصيل المخوار", icon: Scissors },
    { id: "section-3", titleEn: "Tailors & Measurements", titleAr: "الخياطون والقياسات", icon: Ruler },
    { id: "section-4", titleEn: "Orders & Your Creation Journey", titleAr: "مسار طلبك وتفصيله", icon: ShoppingBag },
    { id: "section-5", titleEn: "Delivery & Returns", titleAr: "التوصيل والإرجاع", icon: Truck },
    { id: "section-6", titleEn: "Payments & Your MOTD Account", titleAr: "الحساب والمدفوعات", icon: CreditCard },
  ];

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === 1) {
      window.location.href = isAr ? "/ar/#designs" : "/en/#designs";
    } else if (stepIndex === 2) {
      window.location.href = isAr ? "/ar/fabrics/fabricStore" : "/en/fabrics/fabricStore";
    } else {
      let targetSection = "section-1";
      if (stepIndex === 3) targetSection = "section-3";
      else if (stepIndex === 4 || stepIndex === 5) targetSection = "section-4";
      else if (stepIndex === 6) targetSection = "section-5";

      setSelectedSection(targetSection);
      setSearchQuery("");
      setOpenIndex(null);

      // Smooth scroll to sections anchor
      setTimeout(() => {
        sectionsContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
    setSearchQuery("");
    setOpenIndex(null);
    setTimeout(() => {
      sectionsContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const toggleFAQ = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  // Filter items matching selected section AND query
  const filteredFAQs = FAQ_ITEMS.filter((item) => {
    if (item.sectionId !== selectedSection) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return isAr
      ? item.questionAr.toLowerCase().includes(query) || item.answerAr.toLowerCase().includes(query)
      : item.questionEn.toLowerCase().includes(query) || item.answerEn.toLowerCase().includes(query);
  });

  return (
    <MainLayout>
      <div className="bg-white min-h-screen">
        {/* 1. Page Header */}
        <section className="relative overflow-hidden py-16 sm:py-24 bg-white text-black text-center border-b border-[#E8E8E4]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.02),transparent_60%)]"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-4">
            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.32em] text-[#8A8A80] block">
              {isAr ? "دليل MOTD" : "THE MOTD GUIDE"}
            </span>
            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-black leading-tight">
              {isAr ? "دليل MOTD" : "The MOTD Guide"}
            </h1>
            <div className="h-px w-20 bg-black/10 mx-auto my-3"></div>
            <p className="[font-family:var(--font-body)] text-[#5A5A56] max-w-2xl mx-auto text-[15px] sm:text-[18px] leading-relaxed font-light">
              {isAr
                ? "كل ما تحتاج لمعرفته حول طلب وتفصيل والعناية والاستمتاع بالمخوار الخاص بك."
                : "Everything you need to know about ordering, tailoring, caring for and enjoying your Mukhawar."}
            </p>
            <div className="pt-4 flex justify-center">
              <motion.button
                onClick={() => sectionsContainerRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8A8A80] hover:text-black transition cursor-pointer"
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <span>{isAr ? "استكشف الدليل" : "Explore Guide"}</span>
                <ArrowDown className="w-3.5 h-3.5 text-[#8A8A80]" />
              </motion.button>
            </div>
          </div>
        </section>

        {/* 2. Customer Journey Section */}
        <section className="py-16 sm:py-20 border-b border-[#E8E8E4] bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] text-[#8A8A80] block mb-2">
                {isAr ? "كيف يعمل؟" : "HOW IT WORKS"}
              </span>
              <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl font-light text-black tracking-tight">
                {isAr ? "كيف تنبض مخورتك بالحياة" : "How Your Mukhawar Comes to Life"}
              </h2>
              <div className="h-0.5 w-12 bg-black/10 mx-auto mt-3"></div>
            </div>

            {/* Clickable Ribbon Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 relative">
              {[
                { step: 1, textEn: "Choose a Design", textAr: "اختر التصميم" },
                { step: 2, textEn: "Choose a Fabric", textAr: "اختر القماش" },
                { step: 3, textEn: "Add Measurements", textAr: "أدخل مقاساتك" },
                { step: 4, textEn: "Tailoring Begins", textAr: "بدء الخياطة" },
                { step: 5, textEn: "Quality Check", textAr: "فحص الجودة" },
                { step: 6, textEn: "Delivery to Door", textAr: "التوصيل لبابك" }
              ].map((item, idx) => (
                <div key={item.step} className="flex flex-col items-center">
                  <button
                    onClick={() => handleStepClick(item.step)}
                    className="w-full bg-[#FFFDF9] border border-[#E8E8E4] rounded-2xl p-5 text-center transition-all duration-300 hover:border-black hover:shadow-md cursor-pointer group flex flex-col items-center justify-between h-36"
                  >
                    <span className="w-8 h-8 rounded-full bg-black/5 text-black flex items-center justify-center font-bold text-sm group-hover:bg-black group-hover:text-white transition-colors">
                      {item.step}
                    </span>
                    <span className="[font-family:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-black mt-3 block leading-snug">
                      {isAr ? item.textAr : item.textEn}
                    </span>
                    <span className="text-[10px] text-[#8A8A80] underline group-hover:text-black mt-2 block transition-colors">
                      {isAr ? "عرض التفاصيل" : "Learn details"}
                    </span>
                  </button>
                  {/* Join Arrows */}
                  {idx < 5 && (
                    <div className="hidden md:flex absolute top-16 translate-x-1/2 right-[calc(83.33%-(idx*16.66%))] text-[#8A8A80] font-light text-lg pointer-events-none">
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Six FAQ Sections Grid */}
        <section ref={sectionsContainerRef} className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center space-y-2">
            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] text-[#8A8A80] block">
              {isAr ? "دليل المساعدة الذكي" : "SMART HELP GUIDE"}
            </span>
            <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl font-light text-black tracking-tight">
              {isAr ? "تصفح الأسئلة حسب الموضوع" : "Browse Guide Topics"}
            </h2>
            <p className="text-sm text-[#8A8A80] [font-family:var(--font-body)]">
              {isAr ? "اختر أحد المواضيع الستة أدناه للاطلاع على الأسئلة والأجوبة المتعلقة به." : "Select one of the 6 sections below to view relevant questions."}
            </p>
          </div>

          {/* 6 Section Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isSelected = selectedSection === sec.id;
              const questionsCount = FAQ_ITEMS.filter(item => item.sectionId === sec.id).length;

              return (
                <button
                  key={sec.id}
                  onClick={() => handleSectionSelect(sec.id)}
                  className={`border rounded-2xl p-5 text-left flex flex-col justify-between h-40 cursor-pointer transition-all duration-300 relative overflow-hidden group
                    ${isSelected
                      ? "bg-black border-black text-white shadow-lg"
                      : "bg-white border-[#E8E8E4] text-black hover:border-black hover:shadow-md"
                    }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${isSelected ? "bg-white/10" : "bg-black/5"}`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-black"}`} />
                  </div>

                  <div className="space-y-1 mt-4">
                    <h3 className="[font-family:var(--font-display)] text-sm font-semibold tracking-tight uppercase leading-snug">
                      {isAr ? sec.titleAr : sec.titleEn}
                    </h3>
                    <span className={`text-[11px] block
                      ${isSelected ? "text-white/60" : "text-[#8A8A80]"}`}
                    >
                      {questionsCount} {isAr ? "أسئلة" : "Questions"}
                    </span>
                  </div>

                  {/* Corner Accent Arrow */}
                  <ChevronRight className={`absolute bottom-5 right-5 w-4 h-4 transition-transform duration-300
                    ${isSelected ? "text-white/40 translate-x-0" : "text-[#8A8A80] opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0"}`}
                  />
                </button>
              );
            })}
          </div>

          {/* 4. Active Q&As Section */}
          <div id="sections-container" className="border-t border-[#E8E8E4] pt-12 space-y-8 max-w-3xl mx-auto">
            {/* active header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E8E8E4]">
              <div>
                <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-wider text-[#8A8A80] block">
                  {isAr ? "الموضوع المحدد حالياً" : "CURRENT GUIDE TOPIC"}
                </span>
                <h3 className="[font-family:var(--font-display)] text-xl font-medium text-black">
                  {isAr
                    ? SECTIONS.find(s => s.id === selectedSection)?.titleAr
                    : SECTIONS.find(s => s.id === selectedSection)?.titleEn
                  }
                </h3>
              </div>

              {/* category search */}
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#8A8A80]">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder={isAr ? "ابحث في هذا القسم..." : "Search inside section..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 bg-white border border-[#E8E8E4] rounded-lg focus:outline-none focus:border-black text-xs [font-family:var(--font-body)] text-black transition-colors"
                />
              </div>
            </div>

            {/* Accordion list */}
            <div className="border border-[#E8E8E4] rounded-2xl bg-white divide-y divide-[#E8E8E4] overflow-hidden shadow-sm">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq) => {
                  const isOpen = openIndex === faq.id;
                  return (
                    <div key={faq.id} className="transition-colors duration-150">
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full p-5 flex items-center justify-between text-left gap-4 hover:bg-black/1 transition cursor-pointer"
                      >
                        <span className="[font-family:var(--font-display)] text-sm sm:text-base font-medium text-black">
                          {isAr ? faq.questionAr : faq.questionEn}
                        </span>
                        <span className="shrink-0 text-black">
                          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <div className="px-5 pb-5 pt-1 [font-family:var(--font-body)] text-xs sm:text-sm leading-relaxed text-[#5A5A56] whitespace-pre-line">
                              {isAr ? faq.answerAr : faq.answerEn}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center [font-family:var(--font-body)] text-xs text-[#8A8A80]">
                  {isAr ? "لا توجد أسئلة تطابق بحثك في هذا القسم." : "No questions match your search in this section."}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}