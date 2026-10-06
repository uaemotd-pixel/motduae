/** Shared MOTD FAQ content (EN + AR).
 * Guide page: GUIDE_FAQ_ITEMS + sectionId (section-1..6).
 * Chatbot: FAQ_ITEMS + chatTopicId + CHATBOT_FAQ_SECTIONS.
 */

export interface FAQItem {
  id: string;
  sectionId: string;
  /** Chatbot topic (CHATBOT_FAQ_SECTIONS). Guide page uses sectionId only. */
  chatTopicId: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  /** When true, shown in chatbot only — not on the MOTD Guide page. */
  chatbotOnly?: boolean;
}

export const FAQ_ITEMS: FAQItem[] = [
  // Section 1: Getting Started
  {
    id: "gs-1",
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "What is MOTD?",
    questionAr: "ما هي منصة MOTD؟",
    answerEn:
      "MOTD (Mukhawar of the Day) is an online platform dedicated to the timeless elegance of the Emirati Mukhawar. We bring together carefully selected designs, premium fabrics and skilled tailors in one seamless experience, allowing you to create a Mukhawar that is uniquely yours.\n\nWhether you're ordering for everyday wear, special occasions or gifting, every piece is made with care, craftsmanship and attention to detail.",
    answerAr:
      "MOTD (مخوار اليوم) هي منصة إلكترونية تُعنى بالأناقة الخالدة للمخوار الإماراتي. نجمع بين تصاميم مختارة بعناية، وأقمشة فاخرة، وخياطين مهرة في تجربة سلسة، تتيح لك تصميم مخوار فريد من نوعه.\n\nسواء كنت تطلبه للاستخدام اليومي، أو للمناسبات الخاصة، أو كهدية، فإن كل قطعة مصنوعة بعناية فائقة، وحرفية عالية، واهتمام دقيق بالتفاصيل.",
  },
  {
    id: "gs-2",
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "What is a Mukhawar?",
    questionAr: "ما هو المخوار؟",
    answerEn:
      "A Mukhawar is a traditional Emirati dress that has been worn by women for generations. Known for its elegant silhouette and distinctive hand embroidery, each Mukhawar reflects the rich cultural heritage of the UAE while allowing room for personal style and creativity.\n\nToday, Mukhawars are worn for everyday elegance, family gatherings, celebrations, and special occasions, with endless possibilities for fabrics, embroidery, and design details.",
    answerAr:
      "المخوار هو زي إماراتي تقليدي ترتديه النساء منذ أجيال. يشتهر بشكله الأنيق وتطريزه اليدوي المميز، ويعكس كل مخوار التراث الثقافي الغني لدولة الإمارات مع ترك مساحة للأسلوب الشخصي والإبداع.\n\nاليوم، يُرتدى المخوار للأناقة اليومية، والتجمعات العائلية، والمناسبات السعيدة، والمناسبات الخاصة، مع إمكانيات لا حصر لها من الأقمشة والتطريز وتفاصيل التصميم.",
  },
  {
    id: "gs-3",
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "How does MOTD work?",
    questionAr: "كيف تعمل منصة MOTD؟",
    answerEn:
      "Ordering your Mukhawar is simple.\n1. Choose your preferred design.\n2. Select your preferred fabric or choose to provide one.\n3. Add your measurements or select a saved measurement profile.\n4. Place your order securely online.\n\nOnce your order is confirmed, we coordinate the journey from fabric selection to tailoring and quality review before delivering your finished Mukhawar to your doorstep.",
    answerAr:
      "طلب المخوار الخاص بك بسيط.\n1. اختر التصميم الذي تفضله.\n2. اختر القماش المفضل لديك أو اختر توفير قماشك الخاص.\n3. أضف مقاساتك أو اختر ملف قياسات محفوظ.\n4. ضع طلبك بشكل آمن عبر الإنترنت.\n\nبمجرد تأكيد طلبك، نقوم بتنسيق الرحلة من اختيار القماش إلى الخياطة ومراجعة الجودة قبل توصيل المخوار النهائي إلى باب منزلك.",
  },
  {
    id: "gs-4",
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "Is MOTD a tailor?",
    questionAr: "هل MOTD هي خياط؟",
    answerEn:
      "No.\n\nMOTD is a platform that connects customers with carefully selected tailors and fabric suppliers while overseeing the entire experience from order placement to delivery.\nEvery tailor featured on MOTD is chosen based on their craftsmanship, quality and reliability.",
    answerAr:
      "لا.\n\nMOTD هي منصة تربط العملاء بخياطين وموردي أقمشة مختارين بعناية، وتشرف على التجربة بأكملها من تقديم الطلب إلى التوصيل.\nيتم اختيار كل خياط على MOTD بناءً على حرفيته وجودته وموثوقيته.",
  },
  {
    id: "gs-5",
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn:
      "Why should I order through MOTD instead of contacting a tailor directly?",
    questionAr: "لماذا أطلب عبر MOTD بدلاً من الاتصال بالخياط مباشرة؟",
    answerEn:
      "MOTD simplifies what is often a time-consuming process.\n\nInstead of searching for a tailor, sourcing fabrics and coordinating everything yourself, MOTD brings the entire experience together in one place.\n\nWith MOTD you can:\n• Browse curated Mukhawar designs.\n• Discover premium fabrics.\n• Choose from trusted tailoring partners.\n• Save measurement profiles for future orders.\n• Track your order from production to delivery.\n• Enjoy a carefully managed customer experience from start to finish.",
    answerAr:
      "تقوم MOTD بتبسيط ما غالباً ما يكون عملية مستهلكة للوقت.\n\nبدلاً من البحث عن خياط، وتوفير الأقمشة، وتنسيق كل شيء بنفسك، تجمع MOTD التجربة بأكملها في مكان واحد.\n\nمع MOTD يمكنك:\n• تصفح تصاميم المخوار المختارة.\n• اكتشاف الأقمشة الفاخرة.\n• الاختيار من بين شركاء خياطة موثوقين.\n• حفظ ملفات القياسات للطلبات المستقبلية.\n• تتبع طلبك من الإنتاج إلى التوصيل.\n• الاستمتاع بتجربة عميل مُدارة بعناية من البداية إلى النهاية.",
  },
  {
    id: "gs-6",
    sectionId: "section-1",
    chatTopicId: "chat-account",
    questionEn: "Do I need to create an account?",
    questionAr: "هل أحتاج إلى إنشاء حساب؟",
    answerEn:
      "Creating an account is recommended, as it allows you to:\n• Save your favourite designs and fabrics.\n• Store multiple measurement profiles.\n• View your order history.\n• Reorder previous Mukhawars with ease.\n• Track your orders.\n• Manage your personal details securely.",
    answerAr:
      "يُنصح بإنشاء حساب، حيث يتيح لك:\n• حفظ التصاميم والأقمشة المفضلة لديك.\n• تخزين ملفات قياسات متعددة.\n• عرض سجل طلباتك.\n• إعادة طلب المخوارات السابقة بسهولة.\n• تتبع طلباتك.\n• إدارة تفاصيلك الشخصية بأمان.",
  },
  {
    id: "gs-7",
    sectionId: "section-1",
    chatTopicId: "chat-account",
    questionEn: "Can I place an order without an account?",
    questionAr: "هل يمكنني تقديم طلب بدون حساب؟",
    answerEn:
      "Yes. Guests may place an order without creating an account. However, creating a MOTD account allows you to save your measurements, track orders, access your order history and enjoy a faster checkout experience in the future.",
    answerAr:
      "نعم. يمكن للضيوف تقديم طلب دون إنشاء حساب. ومع ذلك، فإن إنشاء حساب MOTD يسمح لك بحفظ قياساتك، وتتبع الطلبات، والوصول إلى سجل طلباتك والاستمتاع بتجربة دفع أسرع في المستقبل.",
  },
  {
    id: "gs-8",
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "Where is MOTD based?",
    questionAr: "أين يقع مقر MOTD؟",
    answerEn:
      "MOTD is proudly based in the United Arab Emirates, celebrating Emirati heritage through thoughtfully designed Mukhawars and exceptional craftsmanship.\n\nWe work with trusted partners who share our commitment to quality and authenticity.",
    answerAr:
      "MOTD موجودة بفخر في دولة الإمارات العربية المتحدة، وتحتفل بالتراث الإماراتي من خلال مخوارات مصممة بعناية وحرفية استثنائية.\n\nنعمل مع شركاء موثوقين يشاركوننا الالتزام بالجودة والأصالة.",
  },
  {
    id: "gs-9",
    sectionId: "section-1",
    chatTopicId: "chat-delivery",
    questionEn: "Which countries does MOTD deliver to?",
    questionAr: "إلى أي الدول توصل MOTD؟",
    answerEn: "MOTD currently delivers across the United Arab Emirates.",
    answerAr: "توصل MOTD حالياً في جميع أنحاء دولة الإمارات العربية المتحدة.",
  },
  {
    id: "gs-10",
    sectionId: "section-1",
    chatTopicId: "chat-support",
    questionEn: "How can I contact MOTD?",
    questionAr: "كيف يمكنني التواصل مع MOTD؟",
    answerEn:
      "Our Care Team is always happy to help.\n\nYou can reach us through:\nEmail: care@motd.ae\n\nYou may also contact us through WhatsApp live chat at @MOTDae (+971569722533), Monday to Thursday, during business hours, 10:00 AM to 17:00 PM (UAE time).",
    answerAr:
      "فريق الرعاية لدينا سعيد دائماً بمساعدتك.\n\nيمكنك التواصل معنا عبر:\nالبريد الإلكتروني: care@motd.ae\n\nيمكنك أيضاً التواصل معنا عبر الدردشة المباشرة على واتساب على @MOTDae (+971569722533)، من الاثنين إلى الخميس، خلال ساعات العمل، من 10:00 صباحاً إلى 5:00 مساءً (بتوقيت الإمارات).",
  },
  {
    id: "gs-11",
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "How do I know which Mukhawar is right for me?",
    questionAr: "كيف أعرف أي مخوار مناسب لي؟",
    answerEn:
      "Every woman has her own style.\n\nUse our filters to browse by:\n• Design\n• Fabric\n• Colour\n• Occasion\n• Embroidery style\n• New Arrivals\n• Best Sellers\n\nIf you're unsure where to begin, our Care Team will be delighted to help you choose the perfect combination.",
    answerAr:
      "لكل امرأة أسلوبها الخاص.\n\nاستخدم عوامل التصفية للتصفح حسب:\n• التصميم\n• القماش\n• اللون\n• المناسبة\n• أسلوب التطريز\n• الوافدين الجدد\n• الأكثر مبيعاً\n\nإذا كنت غير متأكدة من أين تبدأين، سيسعد فريق الرعاية لدينا بمساعدتك في اختيار التركيبة المثالية.",
  },
  {
    id: "gs-12",
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "Can I visit a physical showroom?",
    questionAr: "هل يمكنني زيارة صالة عرض فعلية؟",
    answerEn:
      "MOTD is currently an online experience designed to make ordering your Mukhawar simple and convenient from anywhere.\n\nIf we host pop-up events, exhibitions or fitting appointments in the future, we'll announce them through our website and social media channels.",
    answerAr:
      "MOTD حالياً هي تجربة إلكترونية مصممة لجعل طلب المخوار بسيطاً ومريحاً من أي مكان.\n\nإذا استضفنا فعاليات منبثقة أو معارض أو مواعيد تجربة في المستقبل، سنعلن عنها عبر موقعنا الإلكتروني وقنوات التواصل الاجتماعي.",
  },
  {
    id: "gs-13",
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "Is every Mukhawar made to order?",
    questionAr: "هل كل مخوار يُصنع حسب الطلب؟",
    answerEn:
      "Most designs on MOTD are available for you to personalise by selecting your preferred fabric, measurements, and any available design customisations, allowing you to create a Mukhawar that's uniquely yours.\n\nIf you're looking for something ready to wear, you can also explore our Ready to Order collection. These pieces are already made and available for quicker delivery, with each listing clearly identified on the product page.",
    answerAr:
      "معظم التصاميم على MOTD متاحة لتخصيصها باختيار القماش المفضل لديك، والقياسات، وأي تخصيصات تصميم متاحة، مما يتيح لك إنشاء مخوار فريد لك.\n\nإذا كنت تبحث عن شيء جاهز للارتداء، يمكنك أيضاً استكشاف مجموعتنا الجاهزة للطلب. هذه القطع مُصنعة بالفعل ومتاحة للتوصيل بشكل أسرع، مع تحديد كل قائمة بوضوح على صفحة المنتج.",
  },
  {
    id: "gs-14",
    sectionId: "section-1",
    chatTopicId: "chat-rto",
    questionEn: "How do I know if a product is Ready to Order?",
    questionAr: "كيف أعرف إذا كان المنتج جاهزاً للطلب؟",
    answerEn:
      "Ready to Order pieces are clearly labelled on the product page. You'll also find them in the dedicated Ready to Order section, where you can browse Mukhawars that are already made and available for faster delivery.",
    answerAr:
      "القطع الجاهزة للطلب مُعلَّمة بوضوح على صفحة المنتج. ستجدها أيضاً في قسم الجاهز للطلب المخصص، حيث يمكنك تصفح المخوارات المُصنعة بالفعل والمتاحة للتوصيل بشكل أسرع.",
  },

  // Section 2: Creating Your Mukhawar
  {
    id: "cm-1",
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "How do I create my Mukhawar?",
    questionAr: "كيف أنشئ المخوار الخاص بي؟",
    answerEn:
      "There's no single way to create your Mukhawar—you can start wherever inspiration strikes.\n\n• Browse designs to find a style you love.\n• Explore fabrics if you're inspired by a particular colour, texture, or seasonal collection.\n• Or start with a tailor and discover the designs they offer.\n\nAs you explore, you'll build your perfect combination by selecting your design, fabric, and measurements before reviewing your order and completing your purchase. We'll then coordinate every step until your finished Mukhawar arrives at your doorstep.",
    answerAr:
      "لا توجد طريقة واحدة لإنشاء مخوارك - يمكنك البدء من أي مكان يلهمك.\n\n• تصفح التصاميم للعثور على أسلوب تحبينه.\n• استكشف الأقمشة إذا كنتِ مستوحاة من لون معين أو ملمس أو مجموعة موسمية.\n• أو ابدأ مع الخياط واكتشف التصاميم التي يقدمها.\n\nبينما تستكشفين، ستبنين تركيبتك المثالية باختيار التصميم والقماش والقياسات قبل مراجعة طلبك وإتمام عملية الشراء. سنقوم بعد ذلك بتنسيق كل خطوة حتى يصل المخوار النهائي إلى باب منزلك.",
  },
  {
    id: "cm-2",
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "Do I choose the design first or the fabric first?",
    questionAr: "هل أختار التصميم أولاً أم القماش أولاً؟",
    answerEn:
      "It's entirely up to you. You can start with a design, a fabric, or even a tailor. If you're only purchasing fabric, simply browse our fabric collection and place your order without selecting a design or tailor.",
    answerAr:
      "الأمر متروك لك تماماً. يمكنك البدء بتصميم، أو قماش، أو حتى خياط. إذا كنت تشتري قماشاً فقط، ما عليك سوى تصفح مجموعتنا من الأقمشة وتقديم طلبك دون اختيار تصميم أو خياط.",
  },
  {
    id: "cm-3",
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "Can I choose any fabric for any design?",
    questionAr: "هل يمكنني اختيار أي قماش لأي تصميم؟",
    answerEn:
      "In most cases, yes. Many designs can be created using a variety of fabrics, giving you the freedom to create a Mukhawar that reflects your personal style.\n\nTo help you decide, some tailors may also recommend a selection of fabrics they believe best complement a particular design. If a specific fabric isn't suitable for a design, you'll be guided to the available options during the creation process.",
    answerAr:
      "في معظم الحالات، نعم. يمكن إنشاء العديد من التصاميم باستخدام مجموعة متنوعة من الأقمشة، مما يمنحك الحرية في إنشاء مخوار يعكس أسلوبك الشخصي.\n\nلمساعدتك في اتخاذ القرار، قد يوصي بعض الخياطين بمجموعة من الأقمشة التي يعتقدون أنها تكمل التصميم بشكل أفضل. إذا كان قماش معين غير مناسب لتصميم ما، سيتم توجيهك إلى الخيارات المتاحة أثناء عملية الإنشاء.",
  },
  {
    id: "cm-4",
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "How do I know which fabric suits a design best?",
    questionAr: "كيف أعرف أي قماش يناسب التصميم بشكل أفضل؟",
    answerEn:
      "Some designs include fabric recommendations from the tailor to help inspire your choice and make the decision easier. These suggestions highlight fabrics that beautifully complement the design, but you're free to explore other available options.\n\nIf you're unsure, our Care Team is always happy to help you choose the perfect combination.",
    answerAr:
      "تتضمن بعض التصاميم توصيات الأقمشة من الخياط للمساعدة في إلهام اختيارك وتسهيل القرار. تسلط هذه الاقتراحات الضوء على الأقمشة التي تكمل التصميم بشكل جميل، لكنك حر في استكشاف الخيارات الأخرى المتاحة.\n\nإذا كنت غير متأكد، فإن فريق الرعاية لدينا سعيد دائماً بمساعدتك في اختيار التركيبة المثالية.",
  },
  {
    id: "cm-5",
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "Can I use my own fabric?",
    questionAr: "هل يمكنني استخدام قماشي الخاص؟",
    answerEn:
      "Yes. If you're creating a Mukhawar, you can either choose a fabric from MOTD or provide your own fabric.\n\nIf you choose to use your own fabric, simply select the Provide My Own Fabric option and complete your order. We'll then arrange for a courier to contact you and collect the fabric from your preferred location before delivering it to your selected tailor.\n\nOnce received, the tailor will review the fabric to ensure it's suitable for your chosen design. If there are any concerns, we'll contact you to discuss the available options.",
    answerAr:
      "نعم. إذا كنت تنشئ مخواراً، يمكنك إما اختيار قماش من MOTD أو توفير قماشك الخاص.\n\nإذا اخترت استخدام قماشك الخاص، ما عليك سوى تحديد خيار توفير قماشي الخاص وإكمال طلبك. سنقوم بعد ذلك بترتيب اتصال شركة شحن بك وجمع القماش من الموقع المفضل لديك قبل توصيله إلى الخياط الذي اخترته.\n\nبمجرد الاستلام، سيراجع الخياط القماش للتأكد من أنه مناسب للتصميم الذي اخترته. إذا كانت هناك أي مخاوف، سنتصل بك لمناقشة الخيارات المتاحة.",
  },
  {
    id: "cm-6",
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "Can I buy fabric without ordering a Mukhawar?",
    questionAr: "هل يمكنني شراء قماش دون طلب مخوار؟",
    answerEn:
      "Yes.\n\nYou're welcome to purchase fabrics directly from MOTD without ordering tailoring services. Simply browse our fabric collection, add your chosen fabric to your cart, and complete your purchase.",
    answerAr:
      "نعم.\n\nنرحب بك لشراء الأقمشة مباشرة من MOTD دون طلب خدمات خياطة. ما عليك سوى تصفح مجموعتنا من الأقمشة، وإضافة القماش الذي اخترته إلى سلة التسوق، وإتمام عملية الشراء.",
  },
  {
    id: "cm-7",
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "Can I order embroidery without fabric?",
    questionAr: "هل يمكنني طلب تطريز بدون قماش؟",
    answerEn:
      "Yes. If you already have your own fabric, simply choose your preferred design and select the Provide My Own Fabric option during the ordering process.\n\nWe'll arrange for a courier to collect your fabric and deliver it to your selected tailor, who will complete the embroidery and tailoring based on your order before your finished Mukhawar is returned to you.",
    answerAr:
      "نعم. إذا كان لديك قماشك الخاص بالفعل، ما عليك سوى اختيار التصميم المفضل لديك وتحديد خيار توفير قماشي الخاص أثناء عملية الطلب.\n\nسنرتب لشركة شحن لجمع قماشك وتوصيله إلى الخياط الذي اخترته، والذي سيكمل التطريز والخياطة بناءً على طلبك قبل إعادة المخوار النهائي إليك.",
  },
  {
    id: "cm-8",
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "What is Tana Lawn Cotton?",
    questionAr: "ما هو قطن تانا لاون؟",
    answerEn:
      "Tana Lawn Cotton is one of the world's finest cotton fabrics, known for its exceptional softness, lightweight feel and breathable comfort.\n\nIts smooth finish makes it an excellent choice for elegant, comfortable Mukhawars suitable for both everyday wear and special occasions.",
    answerAr:
      "قطن تانا لاون هو أحد أفضل أقمشة القطن في العالم، المعروف بنعومته الاستثنائية، وخفته، وراحته القابلة للتنفس.\n\nيجعله تشطيبه الناعم خياراً ممتازاً لمخوارات أنيقة ومريحة مناسبة للارتداء اليومي والمناسبات الخاصة.",
  },
  {
    id: "cm-9",
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "How much fabric do I need?",
    questionAr: "كم أحتاج من القماش؟",
    answerEn:
      "The amount of fabric required depends on your selected design and your measurements.\n\nIf you're purchasing fabric through MOTD, we'll help ensure you order the appropriate quantity for your Mukhawar. If you're providing your own fabric and additional fabric is required, we'll contact you before production continues.",
    answerAr:
      "تعتمد كمية القماش المطلوبة على التصميم الذي اخترته وقياساتك.\n\nإذا كنت تشتري قماشاً عبر MOTD، فسنضمن طلب الكمية المناسبة لمخوارك. إذا كنت تقدم قماشك الخاص وكانت هناك حاجة إلى قماش إضافي، فسنتصل بك قبل استمرار الإنتاج.",
  },
  {
    id: "cm-10",
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn:
      "Will the fabric colour look exactly the same as it does online?",
    questionAr: "هل سيبدو لون القماش تماماً كما يظهر على الإنترنت؟",
    answerEn:
      "We strive to present fabric colours as accurately as possible. However, the appearance of colours may vary slightly depending on lighting conditions, photography, and your device's screen settings.\n\nWe recommend reviewing all available images and product details before placing your order. If you have any questions about a fabric, our Care Team will be happy to assist you.",
    answerAr:
      "نسعى جاهدين لتقديم ألوان الأقمشة بأكبر قدر ممكن من الدقة. ومع ذلك، قد يختلف مظهر الألوان قليلاً اعتماداً على ظروف الإضاءة والتصوير وإعدادات شاشة جهازك.\n\nنوصي بمراجعة جميع الصور المتاحة وتفاصيل المنتج قبل تقديم طلبك. إذا كان لديك أي أسئلة حول قماش معين، سيسعد فريق الرعاية لدينا بمساعدتك.",
  },
  {
    id: "cm-11",
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "How do I choose the right fabric for the season?",
    questionAr: "كيف أختار القماش المناسب للموسم؟",
    answerEn:
      "Each fabric page includes details about the fabric type to help you make an informed choice. As a general guide, lightweight cotton fabrics are ideal for warmer weather, while silk and crepe fabrics are popular choices for elegant wear and special occasions.",
    answerAr:
      "تتضمن كل صفحة قماش تفاصيل حول نوع القماش لمساعدتك في اتخاذ قرار مستنير. كدليل عام، الأقمشة القطنية الخفيفة مثالية للطقس الدافئ، بينما أقمشة الحرير والكريب هي خيارات شائعة للارتداء الأنيق والمناسبات الخاصة.",
  },
  {
    id: "cm-12",
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "Can I save my favourite combinations?",
    questionAr: "هل يمكنني حفظ تركيباتي المفضلة؟",
    answerEn:
      "Yes.\n\nSimply tap the ♡ icon on any design, fabric, or Ready to Order piece to add it to your Wishlist. Your saved favourites will be available anytime, making it easy to revisit them, compare your options, or continue creating your Mukhawar later.",
    answerAr:
      "نعم.\n\nما عليك سوى النقر على أيقونة ♡ على أي تصميم أو قماش أو قطعة جاهزة للطلب لإضافتها إلى قائمة رغباتك. ستكون مفضلاتك المحفوظة متاحة في أي وقت، مما يسهل العودة إليها أو مقارنة خياراتك أو مواصلة إنشاء مخوارك لاحقاً.",
  },
  {
    id: "cm-13",
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "Can I recreate a previous Mukhawar?",
    questionAr: "هل يمكنني إعادة إنشاء مخوار سابق؟",
    answerEn:
      "Yes.\n\nIf your previous design and fabric are still available, you can recreate the same Mukhawar with just a few clicks.\n\nYou can also keep the same design while selecting a different fabric, or pair your favourite fabric with a completely new design.",
    answerAr:
      "نعم.\n\nإذا كان تصميمك السابق وقماشك لا يزالان متاحين، يمكنك إعادة إنشاء نفس المخوار ببضع نقرات فقط.\n\nيمكنك أيضاً الاحتفاظ بنفس التصميم مع اختيار قماش مختلف، أو إقران قماشك المفضل بتصميم جديد تماماً.",
  },
  {
    id: "cm-14",
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "How often do you introduce new designs and fabrics?",
    questionAr: "كم مرة تقدمون تصاميم وأقمشة جديدة؟",
    answerEn:
      "We regularly introduce new designs, fabrics, and limited-edition collections throughout the year.\n\nCreate an account to stay up to date with our latest arrivals, and become a MOTD Member to unlock exclusive designs, early access to new drops, and other member-only benefits as you progress with us.",
    answerAr:
      "نقدم بانتظام تصاميم وأقمشة جديدة ومجموعات محدودة الإصدار على مدار العام.\n\nأنشئ حساباً للبقاء على اطلاع بأحدث الوافدين لدينا، وكن عضواً في MOTD لفتح التصاميم الحصرية والوصول المبكر إلى الإصدارات الجديدة والمزايا الأخرى للأعضاء فقط أثناء تقدمك معنا.",
  },
  {
    id: "cm-15",
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn:
      "How do I know if my design and fabric will look good together?",
    questionAr: "كيف أعرف إذا كان تصميمي وقماشي سيبدوان جيدين معاً؟",
    answerEn:
      "Every recommended combination on MOTD has been carefully curated by our team. If you choose your own combination, we'll review it before production begins. If we believe another fabric would better complement your chosen design, we'll share our recommendations with you before tailoring starts.\n\nThis is part of our commitment to delivering a Mukhawar you'll truly love.",
    answerAr:
      "كل تركيبة موصى بها على MOTD تم اختيارها بعناية من قبل فريقنا. إذا اخترت تركيبتك الخاصة، سنراجعها قبل بدء الإنتاج. إذا اعتقدنا أن قماشاً آخر سيكمل التصميم الذي اخترته بشكل أفضل، فسنشارك توصياتنا معك قبل بدء الخياطة.\n\nهذا جزء من التزامنا بتقديم مخوار ستحبينه حقاً.",
  },
  {
    id: "cm-16",
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "Will someone review my order before tailoring begins?",
    questionAr: "هل سيراجع أحدهم طلبي قبل بدء الخياطة؟",
    answerEn:
      "Yes.\n\nBefore production starts, your order is reviewed to ensure all selected details—including the design, fabric, measurements and tailoring requirements—are complete and ready for crafting.\n\nShould we notice anything that requires clarification, our Care Team will contact you before work begins.",
    answerAr:
      "نعم.\n\nقبل بدء الإنتاج، تتم مراجعة طلبك للتأكد من أن جميع التفاصيل المحددة - بما في ذلك التصميم والقماش والقياسات ومتطلبات الخياطة - مكتملة وجاهزة للتصنيع.\n\nإذا لاحظنا أي شيء يتطلب توضيحاً، سيتصل بك فريق الرعاية لدينا قبل بدء العمل.",
  },

  // Section 3: Tailors & Measurements
  {
    id: "tm-1",
    sectionId: "section-3",
    chatTopicId: "chat-tailors",
    questionEn: "How do I choose a tailor?",
    questionAr: "كيف أختار الخياط؟",
    answerEn:
      "Each tailoring partner on MOTD has their own expertise, signature finishing techniques and craftsmanship. You can browse their profile, learn more about their work and choose the tailor who best suits your style and preferences.",
    answerAr:
      "لكل شريك خياطة على MOTD خبرته الخاصة وتقنيات التشطيب المميزة والحرفية. يمكنك تصفح ملفهم الشخصي، ومعرفة المزيد عن عملهم، واختيار الخياط الذي يناسب أسلوبك وتفضيلاتك.",
  },
  {
    id: "tm-2",
    sectionId: "section-3",
    chatTopicId: "chat-tailors",
    questionEn: "How are MOTD tailors selected?",
    questionAr: "كيف يتم اختيار خياطي MOTD؟",
    answerEn:
      "Every tailoring partner is carefully chosen based on quality, craftsmanship, attention to detail and reliability. We work only with tailors who meet our quality standards and share our commitment to creating exceptional Mukhawars.",
    answerAr:
      "يتم اختيار كل شريك خياطة بعناية بناءً على الجودة والحرفية والاهتمام بالتفاصيل والموثوقية. نحن نعمل فقط مع الخياطين الذين يستوفون معايير الجودة لدينا ويشاركوننا الالتزام بإنشاء مخوارات استثنائية.",
  },
  {
    id: "tm-3",
    sectionId: "section-3",
    chatTopicId: "chat-tailors",
    questionEn: "Can I choose a different tailor for each order?",
    questionAr: "هل يمكنني اختيار خياط مختلف لكل طلب؟",
    answerEn:
      "Absolutely.\n\nYou're free to choose any available tailoring partner each time you create a new Mukhawar.\n\nMany customers enjoy exploring different tailoring styles and finishing techniques.",
    answerAr:
      "بالتأكيد.\n\nأنت حر في اختيار أي شريك خياطة متاح في كل مرة تنشئ فيها مخواراً جديداً.\n\nيستمتع العديد من العملاء باستكشاف أنماط الخياطة المختلفة وتقنيات التشطيب.",
  },
  {
    id: "tm-4",
    sectionId: "section-3",
    chatTopicId: "chat-tailors",
    questionEn: "Can I use my own tailor to stitch my Mukhawar?",
    questionAr: "هل يمكنني استخدام خياطي الخاص لخياطة المخوار الخاص بي؟",
    answerEn:
      "Yes.\n\nIf you prefer to use your own tailor, you can order your Mukhawar unstitched. Simply provide your preferred neck opening measurement during checkout, and we'll prepare your Mukhawar accordingly. Once you receive it, you can take it to your preferred tailor for stitching or gift it to someone else to have it tailored to their own measurements.",
    answerAr:
      "نعم.\n\nإذا كنت تفضل استخدام خياطك الخاص، يمكنك طلب المخوار غير مخيط. ما عليك سوى تقديم قياس فتحة الرقبة المفضل لديك أثناء الدفع، وسنقوم بتجهيز المخوار الخاص بك وفقاً لذلك. بمجرد استلامه، يمكنك أخذه إلى الخياط المفضل لديك للخياطة أو إهدائه لشخص آخر لتخصيصه حسب قياساته الخاصة.",
  },
  {
    id: "tm-5",
    sectionId: "section-3",
    chatTopicId: "chat-tailors",
    questionEn: "Can I contact the tailor directly?",
    questionAr: "هل يمكنني الاتصال بالخياط مباشرة؟",
    answerEn:
      "To ensure a smooth and consistent experience, all communication is managed through MOTD.\n\nOur Care Team coordinates directly with your tailoring partner on your behalf whenever needed.",
    answerAr:
      "لضمان تجربة سلسة ومتسقة، تتم إدارة جميع الاتصالات عبر MOTD.\n\nينسق فريق الرعاية لدينا مباشرة مع شريك الخياطة الخاص بك نيابة عنك كلما دعت الحاجة.",
  },
  {
    id: "tm-6",
    sectionId: "section-3",
    chatTopicId: "chat-tailors",
    questionEn: "Will my tailor see my personal information?",
    questionAr: "هل سيرى الخياط معلوماتي الشخصية؟",
    answerEn:
      "Your tailor only receives the information necessary to complete your order, including your selected design, fabric and measurements. Your personal information is handled securely in accordance with our Privacy Policy.",
    answerAr:
      "يتلقى الخياط فقط المعلومات اللازمة لإكمال طلبك، بما في ذلك التصميم والقماش والقياسات التي اخترتها. يتم التعامل مع معلوماتك الشخصية بشكل آمن وفقاً لسياسة الخصوصية الخاصة بنا.",
  },
  {
    id: "tm-7",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "How do I submit my measurements?",
    questionAr: "كيف يمكنني تقديم قياساتي؟",
    answerEn:
      "You can enter your measurements during checkout by completing our step-by-step measurement guide.\n\nEach required measurement includes clear illustrations and instructions to help you measure accurately.",
    answerAr:
      "يمكنك إدخال قياساتك أثناء الدفع من خلال إكمال دليل القياسات خطوة بخطوة.\n\nيتضمن كل قياس مطلوب رسومات توضيحية وتعليمات واضحة لمساعدتك في القياس بدقة.",
  },
  {
    id: "tm-8",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Can I save my measurements?",
    questionAr: "هل يمكنني حفظ قياساتي؟",
    answerEn:
      "Yes.\n\nMOTD Members can securely save their measurement profiles for future orders, making it easy to create new Mukhawars without entering them each time.\n\nSimply create an account and become a MOTD Member to unlock this feature.",
    answerAr:
      "نعم.\n\nيمكن لأعضاء MOTD حفظ ملفات القياسات الخاصة بهم بشكل آمن للطلبات المستقبلية، مما يسهل إنشاء مخوارات جديدة دون إدخالها في كل مرة.\n\nما عليك سوى إنشاء حساب وتصبح عضواً في MOTD لفتح هذه الميزة.",
  },
  {
    id: "tm-9",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Can I save measurements for my family?",
    questionAr: "هل يمكنني حفظ قياسات لعائلتي؟",
    answerEn:
      "Yes.\n\nYour account can store multiple measurement profiles, making it easy to create Mukhawars for yourself, your daughters or other family members.\n\nEach profile can be given a custom name for easy identification.",
    answerAr:
      "نعم.\n\nيمكن لحسابك تخزين ملفات قياسات متعددة، مما يسهل إنشاء مخوارات لنفسك أو لبناتك أو لأفراد العائلة الآخرين.\n\nيمكن إعطاء كل ملف اسماً مخصصاً لسهولة التعرف عليه.",
  },
  {
    id: "tm-10",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "How many measurement profiles can I save?",
    questionAr: "كم عدد ملفات القياسات التي يمكنني حفظها؟",
    answerEn:
      "You can save multiple measurement profiles within your MOTD account, allowing you to manage orders for different family members from one place.",
    answerAr:
      "يمكنك حفظ ملفات قياسات متعددة داخل حسابك في MOTD، مما يتيح لك إدارة الطلبات لأفراد العائلة المختلفين من مكان واحد.",
  },
  {
    id: "tm-11",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Can I edit my saved measurements?",
    questionAr: "هل يمكنني تعديل قياساتي المحفوظة؟",
    answerEn:
      "Yes.\n\nYour saved measurements can be updated at any time through your account before placing a new order.\n\nAny changes will only apply to future orders and will not affect orders already in production.",
    answerAr:
      "نعم.\n\nيمكن تحديث قياساتك المحفوظة في أي وقت من خلال حسابك قبل تقديم طلب جديد.\n\nأي تغييرات ستطبق فقط على الطلبات المستقبلية ولن تؤثر على الطلبات قيد الإنتاج بالفعل.",
  },
  {
    id: "tm-12",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "What if I accidentally entered the wrong measurements?",
    questionAr: "ماذا لو أدخلت قياسات خاطئة عن طريق الخطأ؟",
    answerEn:
      "If you notice an error before tailoring begins, please contact care@motd.ae as soon as possible.\n\nWe'll do our best to update your measurements before production starts.\n\nOnce tailoring has begun, changes may no longer be possible.",
    answerAr:
      "إذا لاحظت خطأً قبل بدء الخياطة، يرجى الاتصال بـ care@motd.ae في أقرب وقت ممكن.\n\nسنبذل قصارى جهدنا لتحديث قياساتك قبل بدء الإنتاج.\n\nبمجرد بدء الخياطة، قد لا تكون التغييرات ممكنة.",
  },
  {
    id: "tm-13",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "What happens if my measurements change over time?",
    questionAr: "ماذا يحدث إذا تغيرت قياساتي بمرور الوقت؟",
    answerEn:
      "Simply update your saved measurement profile before creating your next Mukhawar. We recommend reviewing your measurements regularly to ensure the best possible fit.",
    answerAr:
      "ما عليك سوى تحديث ملف القياسات المحفوظ قبل إنشاء المخوار التالي. نوصي بمراجعة قياساتك بانتظام لضمان أفضل مقاس ممكن.",
  },
  {
    id: "tm-14",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "What if I'm unsure how to measure myself?",
    questionAr: "ماذا لو كنت غير متأكد من كيفية قياس نفسي؟",
    answerEn:
      "Don't worry.\n\nOur measurement guide includes detailed illustrations and helpful tips to walk you through every measurement step.\n\nIf you still need assistance, our Care Team will be happy to help.",
    answerAr:
      "لا تقلقي.\n\nيتضمن دليل القياسات رسومات توضيحية مفصلة ونصائح مفيدة لإرشادك خلال كل خطوة قياس.\n\nإذا كنت لا تزال بحاجة إلى مساعدة، سيسعد فريق الرعاية لدينا بمساعدتك.",
  },
  {
    id: "tm-15",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Are my measurements kept private?",
    questionAr: "هل يتم الاحتفاظ بقياساتي بشكل خاص؟",
    answerEn:
      "Yes.\n\nYour measurements are securely stored within your MOTD account and are only shared with your selected tailoring partner for the purpose of completing your order.",
    answerAr:
      "نعم.\n\nيتم تخزين قياساتك بشكل آمن داخل حسابك في MOTD ولا يتم مشاركتها إلا مع شريك الخياطة الذي اخترته لغرض إكمال طلبك.",
  },
  {
    id: "tm-16",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "How accurate do my measurements need to be?",
    questionAr: "ما مدى دقة قياساتي؟",
    answerEn:
      "Accurate measurements are essential to achieving the best possible fit.\n\nWe recommend measuring carefully using a soft measuring tape and following our illustrated guide.\n\nIf you're unsure, it's always better to double-check before submitting.",
    answerAr:
      "القياسات الدقيقة ضرورية لتحقيق أفضل مقاس ممكن.\n\nنوصي بالقياس بعناية باستخدام شريط قياس ناعم واتباع دليلنا المصور.\n\nإذا كنت غير متأكد، فمن الأفضل دائماً التحقق مرة أخرى قبل التقديم.",
  },
  {
    id: "tm-17",
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Can I add notes for the tailor?",
    questionAr: "هل يمكنني إضافة ملاحظات للخياط؟",
    answerEn:
      "Yes.\n\nDuring checkout, you'll have the opportunity to include additional notes or preferences related to your order.\n\nOur team will review these instructions before production begins.",
    answerAr:
      "نعم.\n\nأثناء الدفع، ستتاح لك الفرصة لتضمين ملاحظات إضافية أو تفضيلات متعلقة بطلبك.\n\nسيراجع فريقنا هذه التعليمات قبل بدء الإنتاج.",
  },

  // Section 4: Orders & Your Creation Journey
  {
    id: "oj-1",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "What happens after I place my order?",
    questionAr: "ماذا يحدث بعد تقديم طلبي؟",
    answerEn:
      "Once your order is confirmed, MOTD begins coordinating every stage of your Mukhawar's creation.\n\nYour order is reviewed, your selected fabric and tailor are confirmed, and production begins once everything is ready.\n\nYou'll receive updates throughout your Mukhawar's journey until it arrives at your doorstep.",
    answerAr:
      "بمجرد تأكيد طلبك، تبدأ MOTD في تنسيق كل مرحلة من مراحل إنشاء المخوار الخاص بك.\n\nتتم مراجعة طلبك، وتأكيد القماش والخياط اللذين اخترتهما، ويبدأ الإنتاج بمجرد أن يكون كل شيء جاهزاً.\n\nستتلقى تحديثات طوال رحلة المخوار الخاص بك حتى يصل إلى باب منزلك.",
  },
  {
    id: "oj-2",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "How will I track my custom Mukhawar order?",
    questionAr: "كيف سأتتبع طلب المخوار المخصص الخاص بي؟",
    answerEn:
      "Your order follows a carefully managed journey:\n1. Order Confirmed\n2. Fabric Dispatched or Scheduled for Collection*\n3. Fabric Received by Tailor\n4. Tailoring in Progress\n5. Ready for Dispatch\n6. Out for Delivery\n7. Delivered\n\nYou'll be notified as your order progresses through each stage.\n\n* Depending on whether you purchase fabric through MOTD or choose to provide your own.",
    answerAr:
      "يتبع طلبك رحلة مُدارة بعناية:\n1. تأكيد الطلب\n2. شحن القماش أو جدولة الاستلام*\n3. استلام القماش من قبل الخياط\n4. الخياطة قيد التقدم\n5. جاهز للشحن\n6. جاري التوصيل\n7. تم التوصيل\n\nسيتم إعلامك بتقدم طلبك خلال كل مرحلة.\n\n* حسب ما إذا كنت تشتري القماش عبر MOTD أو تختار توفير قماشك الخاص.",
  },
  {
    id: "oj-3",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Can I track my order?",
    questionAr: "هل يمكنني تتبع طلبي؟",
    answerEn:
      "Yes.\n\nYou can track your order anytime by logging into your MOTD account, where you'll be able to view its latest status and follow its progress from start to finish.",
    answerAr:
      "نعم.\n\nيمكنك تتبع طلبك في أي وقت عن طريق تسجيل الدخول إلى حسابك في MOTD، حيث ستتمكن من عرض أحدث حالة له ومتابعة تقدمه من البداية إلى النهاية.",
  },
  {
    id: "oj-4",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Can I change my order after placing it?",
    questionAr: "هل يمكنني تغيير طلبي بعد تقديمه؟",
    answerEn:
      "If tailoring has not yet begun, we'll do our best to accommodate your request.\n\nPlease contact care@motd.ae as soon as possible.\n\nOnce production has started, changes may no longer be possible.",
    answerAr:
      "إذا لم تبدأ الخياطة بعد، سنبذل قصارى جهدنا لتلبية طلبك.\n\nيرجى الاتصال بـ care@motd.ae في أقرب وقت ممكن.\n\nبمجرد بدء الإنتاج، قد لا تكون التغييرات ممكنة.",
  },
  {
    id: "oj-5",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Can I make changes to my order after it's been placed?",
    questionAr: "هل يمكنني إجراء تغييرات على طلبي بعد تقديمه؟",
    answerEn:
      "Changes to your measurements, fabric, or other order details may be possible if production has not yet begun.\n\nPlease contact our Care Team as soon as possible, and we'll review your request.\n\nOnce production has started, changes may no longer be possible.",
    answerAr:
      "قد تكون التغييرات على قياساتك أو قماشك أو تفاصيل الطلب الأخرى ممكنة إذا لم يبدأ الإنتاج بعد.\n\nيرجى الاتصال بفريق الرعاية لدينا في أقرب وقت ممكن، وسنراجع طلبك.\n\nبمجرد بدء الإنتاج، قد لا تكون التغييرات ممكنة.",
  },
  {
    id: "oj-6",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Can I cancel my order?",
    questionAr: "هل يمكنني إلغاء طلبي؟",
    answerEn:
      "Orders may be cancelled before tailoring begins.\n\nOnce production has started, customised orders cannot usually be cancelled because work has already commenced on your Mukhawar.\n\nPlease refer to our Returns & Refund Policy for further information.",
    answerAr:
      "يمكن إلغاء الطلبات قبل بدء الخياطة.\n\nبمجرد بدء الإنتاج، لا يمكن عادةً إلغاء الطلبات المخصصة لأن العمل قد بدأ بالفعل على المخوار الخاص بك.\n\nيرجى الرجوع إلى سياسة الإرجاع والاسترداد الخاصة بنا لمزيد من المعلومات.",
  },
  {
    id: "oj-7",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "How long does it take to create a Mukhawar?",
    questionAr: "كم من الوقت يستغرق إنشاء مخوار؟",
    answerEn:
      "Production times vary depending on the design, fabric and tailoring partner.\n\nAn estimated production timeline will be displayed before you complete your order.",
    answerAr:
      "تختلف أوقات الإنتاج حسب التصميم والقماش وشريك الخياطة.\n\nسيتم عرض الجدول الزمني التقديري للإنتاج قبل إكمال طلبك.",
  },
  {
    id: "oj-8",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Can I order more than one Mukhawar at the same time?",
    questionAr: "هل يمكنني طلب أكثر من مخوار في نفس الوقت؟",
    answerEn:
      "Absolutely.\n\nYou may create as many Mukhawars as you'd like in a single order.\n\nEach piece can have its own design, fabric, tailor and measurement profile.",
    answerAr:
      "بالتأكيد.\n\nيمكنك إنشاء أي عدد تريده من المخوارات في طلب واحد.\n\nيمكن أن يكون لكل قطعة تصميمها وقماشها وخياطها وملف قياسات خاص بها.",
  },
  {
    id: "oj-9",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Can I reorder a previous creation?",
    questionAr: "هل يمكنني إعادة طلب إبداع سابق؟",
    answerEn:
      "Yes.\n\nYour previous creations are saved within your account, making it easy to recreate a favourite Mukhawar or use it as inspiration for a new one.",
    answerAr:
      "نعم.\n\nيتم حفظ إبداعاتك السابقة داخل حسابك، مما يسهل إعادة إنشاء مخوار مفضل أو استخدامه كإلهام لمخوار جديد.",
  },
  {
    id: "oj-10",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Will I see the exact completion date?",
    questionAr: "هل سأرى تاريخ الانتهاء الدقيق؟",
    answerEn:
      "Your order page will display an estimated completion and delivery date based on your selected tailor.",
    answerAr:
      "ستعرض صفحة طلبك تاريخ الانتهاء والتوصيل التقديري بناءً على الخياط الذي اخترته.",
  },
  {
    id: "oj-11",
    sectionId: "section-4",
    chatTopicId: "chat-tailors",
    questionEn: "What happens if my tailor experiences an unexpected delay?",
    questionAr: "ماذا يحدث إذا واجه خياطي تأخيراً غير متوقع؟",
    answerEn:
      "If an unexpected delay occurs, we'll notify you as soon as possible and keep you updated on the revised timeline.\n\nOur Care Team will always work to minimise delays and ensure your Mukhawar is completed to the highest standard.",
    answerAr:
      "في حالة حدوث تأخير غير متوقع، سنخطرك في أقرب وقت ممكن ونبقيك على اطلاع على الجدول الزمني المعدل.\n\nسيعمل فريق الرعاية لدينا دائماً على تقليل التأخير وضمان اكتمال المخوار الخاص بك بأعلى مستوى.",
  },
  {
    id: "oj-12",
    sectionId: "section-4",
    chatTopicId: "chat-designs",
    questionEn: "Can I order a Mukhawar as a gift?",
    questionAr: "هل يمكنني طلب مخوار كهدية؟",
    answerEn:
      "Yes.\n\nYou can order a custom Mukhawar using the recipient's measurements or, if you're unsure, order it unstitched by providing an estimated neck opening measurement at checkout page. You can also choose from our Ready to Order collection for a gift that's ready to stitch or ready to wear.",
    answerAr:
      "نعم.\n\nيمكنك طلب مخوار مخصص باستخدام قياسات المستلم، أو إذا كنت غير متأكد، اطلبه غير مخيط من خلال تقديم قياس فتحة الرقبة التقديري في صفحة الدفع. يمكنك أيضاً الاختيار من مجموعتنا الجاهزة للطلب للحصول على هدية جاهزة للخياطة أو جاهزة للارتداء.",
  },
  {
    id: "oj-13",
    sectionId: "section-4",
    chatTopicId: "chat-wardrobe",
    questionEn: "Can I save my creation before ordering?",
    questionAr: "هل يمكنني حفظ إبداعي قبل الطلب؟",
    answerEn:
      "Yes.\n\nSimply add your creation to your Cart or save it to your Wishlist, and you can return to it whenever you're ready to complete your order.",
    answerAr:
      "نعم.\n\nما عليك سوى إضافة إبداعك إلى سلة التسوق أو حفظه في قائمة رغباتك، ويمكنك العودة إليه في أي وقت تكون فيه مستعداً لإكمال طلبك.",
  },
  {
    id: "oj-14",
    sectionId: "section-4",
    chatTopicId: "chat-designs",
    questionEn: "Can I share a design or fabric with someone before ordering?",
    questionAr: "هل يمكنني مشاركة تصميم أو قماش مع شخص ما قبل الطلب؟",
    answerEn:
      "Yes.\n\nSimply tap the Share icon on any design, fabric, or Ready to Order piece to send it through your preferred app and share it with family and friends.",
    answerAr:
      "نعم.\n\nما عليك سوى النقر على أيقونة المشاركة على أي تصميم أو قماش أو قطعة جاهزة للطلب لإرسالها عبر التطبيق المفضل لديك ومشاركتها مع العائلة والأصدقاء.",
  },
  {
    id: "oj-15",
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Can I see my complete order history?",
    questionAr: "هل يمكنني رؤية سجل طلباتي الكامل؟",
    answerEn:
      "Yes.\n\nYour MOTD account keeps a record of all your previous creations, making it easy to reorder favourites, track past purchases and revisit your personal style over time.",
    answerAr:
      "نعم.\n\nيحتفظ حسابك في MOTD بسجل لجميع إبداعاتك السابقة، مما يسهل إعادة طلب المفضلات، وتتبع المشتريات السابقة، وإعادة زيارة أسلوبك الشخصي بمرور الوقت.",
  },
  {
    id: "oj-16",
    sectionId: "section-4",
    chatTopicId: "chat-about",
    questionEn: "What makes the MOTD ordering experience different?",
    questionAr: "ما الذي يجعل تجربة الطلب من MOTD مختلفة؟",
    answerEn:
      "MOTD brings designs, fabrics, tailors, and delivery together in one seamless experience.\n\nWhether you're creating a custom Mukhawar, shopping for fabrics, or choosing a Ready to Order piece, MOTD manages every step—from your first selection to delivery—making the process simple, convenient, and enjoyable.",
    answerAr:
      "تجمع MOTD التصاميم والأقمشة والخياطين والتوصيل في تجربة سلسة واحدة.\n\nسواء كنت تنشئ مخواراً مخصصاً، أو تتسوق للأقمشة، أو تختار قطعة جاهزة للطلب، تدير MOTD كل خطوة - من اختيارك الأول إلى التوصيل - مما يجعل العملية بسيطة ومريحة وممتعة.",
  },

  // Section 5: Delivery & Returns
  {
    id: "dr-1",
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Where does MOTD deliver?",
    questionAr: "إلى أين توصل MOTD؟",
    answerEn: "We currently deliver throughout the United Arab Emirates only.",
    answerAr:
      "نحن نوصل حالياً في جميع أنحاء دولة الإمارات العربية المتحدة فقط.",
  },
  {
    id: "dr-2",
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "How much does delivery cost?",
    questionAr: "كم تكلفة التوصيل؟",
    answerEn:
      "Delivery charges are calculated during checkout based on your delivery address and the contents of your order.\n\nThe final delivery fee will always be displayed before payment.",
    answerAr:
      "يتم حساب رسوم التوصيل أثناء الدفع بناءً على عنوان التوصيل ومحتويات طلبك.\n\nسيتم دائماً عرض رسوم التوصيل النهائية قبل الدفع.",
  },
  {
    id: "dr-3",
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "How long does delivery take?",
    questionAr: "كم من الوقت يستغرق التوصيل؟",
    answerEn:
      "Delivery times depend on your location and whether your order is a Ready to Order item or a Made to Order Mukhawar. Estimated delivery dates are shown during checkout and in your order confirmation.",
    answerAr:
      "تعتمد أوقات التوصيل على موقعك وما إذا كان طلبك قطعة جاهزة للطلب أو مخواراً مصنوعاً حسب الطلب. تظهر تواريخ التوصيل التقديرية أثناء الدفع وفي تأكيد طلبك.",
  },
  {
    id: "dr-4",
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Can I track my delivery?",
    questionAr: "هل يمكنني تتبع شحنتي؟",
    answerEn:
      "Yes.\n\nOnce your order has been dispatched, you'll receive tracking information so you can follow your delivery in real time.",
    answerAr:
      "نعم.\n\nبمجرد شحن طلبك، ستتلقى معلومات التتبع لتتمكن من متابعة شحنتك في الوقت الفعلي.",
  },
  {
    id: "dr-5",
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Will I be notified before delivery?",
    questionAr: "هل سيتم إخطاري قبل التوصيل؟",
    answerEn:
      "Yes.\n\nWe'll notify you when your order has been dispatched and provide delivery updates until it reaches you.",
    answerAr: "نعم.\n\nسنخطرك عند شحن طلبك ونقدم تحديثات التوصيل حتى يصل إليك.",
  },
  {
    id: "dr-6",
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Can someone else receive my order?",
    questionAr: "هل يمكن لشخص آخر استلام طلبي؟",
    answerEn:
      "Yes.\n\nIf someone else will be receiving your order, please ensure they're available at the delivery address and able to accept the package on your behalf.",
    answerAr:
      "نعم.\n\nإذا كان شخص آخر سيتسلم طلبك، يرجى التأكد من أنه متواجد في عنوان التوصيل وقادر على استلام الطرد نيابة عنك.",
  },
  {
    id: "dr-7",
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Can I change my delivery address after placing my order?",
    questionAr: "هل يمكنني تغيير عنوان التوصيل بعد تقديم طلبي؟",
    answerEn:
      "If your order has not yet been dispatched, we'll do our best to update your delivery address.\n\nPlease contact care@motd.ae as soon as possible. You may also contact us through WhatsApp live chat at @MOTDae (+971569722533), Monday to Thursday, during business hours, 10:00 AM to 17:00 PM (UAE time).",
    answerAr:
      "إذا لم يتم شحن طلبك بعد، سنبذل قصارى جهدنا لتحديث عنوان التوصيل الخاص بك.\n\nيرجى الاتصال بـ care@motd.ae في أقرب وقت ممكن. يمكنك أيضاً التواصل معنا عبر الدردشة المباشرة على واتساب على @MOTDae (+971569722533)، من الاثنين إلى الخميس، خلال ساعات العمل، من 10:00 صباحاً إلى 5:00 مساءً (بتوقيت الإمارات).",
  },
  {
    id: "dr-8",
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "What happens if I'm not available during delivery?",
    questionAr: "ماذا يحدث إذا لم أكن متاحاً أثناء التوصيل؟",
    answerEn:
      "Our delivery partner will normally attempt to contact you and arrange another delivery attempt according to their delivery policy.",
    answerAr:
      "سيتصل بك شريك التوصيل عادةً ويرتب محاولة توصيل أخرى وفقاً لسياسة التوصيل الخاصة به.",
  },
  {
    id: "dr-9",
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "Can I return my Mukhawar?",
    questionAr: "هل يمكنني إرجاع المخوار الخاص بي؟",
    answerEn:
      "Made-to-order Mukhawars tailored to your individual measurements cannot be returned or refunded, except if the item arrives damaged or incorrect.\n\nReady to Order items may be eligible for return in accordance with our Returns Policy.",
    answerAr:
      "لا يمكن إرجاع أو استرداد المخوارات المصنوعة حسب الطلب والمفصلة وفقاً لقياساتك الفردية، إلا إذا وصل العنصر تالفاً أو غير صحيح.\n\nقد تكون العناصر الجاهزة للطلب مؤهلة للإرجاع وفقاً لسياسة الإرجاع الخاصة بنا.",
  },
  {
    id: "dr-10",
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "Why can't customised Mukhawars be returned?",
    questionAr: "لماذا لا يمكن إرجاع المخوارات المخصصة؟",
    answerEn:
      "Each customised Mukhawar is created exclusively for you using your chosen design, fabric and measurements.\n\nBecause it has been tailored specifically to your requirements, it cannot be resold to another customer.",
    answerAr:
      "يتم إنشاء كل مخوار مخصص حصرياً لك باستخدام التصميم والقماش والقياسات التي اخترتها.\n\nنظراً لأنه تم تفصيله خصيصاً وفقاً لمتطلباتك، فلا يمكن إعادة بيعه لعميل آخر.",
  },
  {
    id: "dr-11",
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "Which items can be returned?",
    questionAr: "ما هي العناصر التي يمكن إرجاعها؟",
    answerEn:
      "Eligible Ready to Order items may be returned within 30 days of delivery, provided they are:\n• Unworn\n• Unwashed\n• Unaltered\n• In their original condition\n• Returned with all original packaging",
    answerAr:
      "يمكن إرجاع العناصر الجاهزة للطلب المؤهلة في غضون 30 يوماً من التوصيل، بشرط أن تكون:\n• غير مرتدية\n• غير مغسولة\n• غير معدلة\n• في حالتها الأصلية\n• مع إرجاع جميع العبوات الأصلية",
  },
  {
    id: "dr-12",
    sectionId: "section-5",
    chatTopicId: "chat-fabrics",
    questionEn: "Can fabric be returned?",
    questionAr: "هل يمكن إرجاع القماش؟",
    answerEn:
      "Unused standard fabric may be eligible for return in accordance with our Returns Policy.",
    answerAr:
      "قد يكون القماش القياسي غير المستخدم مؤهلاً للإرجاع وفقاً لسياسة الإرجاع الخاصة بنا.",
  },
  {
    id: "dr-13",
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "How do I request a return?",
    questionAr: "كيف يمكنني طلب الإرجاع؟",
    answerEn:
      "If your order is eligible for return, you can submit a return request directly from your order details within 30 days of delivery by selecting Request a Return.\n\nWe'll arrange the return, and once the item has been received and inspected, we'll confirm your refund.",
    answerAr:
      "إذا كان طلبك مؤهلاً للإرجاع، يمكنك تقديم طلب إرجاع مباشرة من تفاصيل طلبك في غضون 30 يوماً من التوصيل عن طريق تحديد طلب إرجاع.\n\nسنرتب الإرجاع، وبمجرد استلام العنصر وفحصه، سنؤكد استردادك.",
  },
  {
    id: "dr-14",
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "How long do refunds take?",
    questionAr: "كم من الوقت يستغرق استرداد المبلغ؟",
    answerEn:
      "Once your returned item has been received and approved, refunds are usually processed within 7–14 business days back to your original payment method.",
    answerAr:
      "بمجرد استلام العنصر المرتجع والموافقة عليه، تتم معالجة استردادات المبلغ عادةً في غضون 7-14 يوم عمل إلى طريقة الدفع الأصلية الخاصة بك.",
  },
  {
    id: "dr-15",
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "What if I receive the wrong item?",
    questionAr: "ماذا لو تلقيت العنصر الخطأ؟",
    answerEn:
      "If you receive the wrong item, please contact our Care Team within 48 hours of delivery by email or WhatsApp and include clear photographs of the item. We'll review the issue and arrange the appropriate solution as quickly as possible.",
    answerAr:
      "إذا تلقيت العنصر الخطأ، يرجى الاتصال بفريق الرعاية لدينا في غضون 48 ساعة من التوصيل عبر البريد الإلكتروني أو واتساب وتضمين صور واضحة للعنصر. سنراجع المشكلة ونرتب الحل المناسب في أسرع وقت ممكن.",
  },
  {
    id: "dr-16",
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "What if my order arrives damaged?",
    questionAr: "ماذا لو وصل طلبي تالفاً؟",
    answerEn:
      "If your order arrives damaged during delivery, please contact us within 48 hours of delivery by email or WhatsApp and include photographs of both the packaging and the item. We'll investigate the issue and work with you to resolve it promptly.",
    answerAr:
      "إذا وصل طلبك تالفاً أثناء التوصيل، يرجى الاتصال بنا في غضون 48 ساعة من التوصيل عبر البريد الإلكتروني أو واتساب وتضمين صور لكل من العبوة والعنصر. سنحقق في المشكلة ونعمل معك لحلها على الفور.",
  },
  {
    id: "dr-17",
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "What if a product is missing from my order?",
    questionAr: "ماذا لو كان منتج مفقوداً من طلبي؟",
    answerEn:
      "If anything appears to be missing, please contact our Care Team within 48 hours of delivery by email or WhatsApp. We'll review your order and arrange any necessary follow-up.",
    answerAr:
      "إذا كان هناك أي شيء مفقود، يرجى الاتصال بفريق الرعاية لدينا في غضون 48 ساعة من التوصيل عبر البريد الإلكتروني أو واتساب. سنراجع طلبك ونرتب أي متابعة ضرورية.",
  },

  // Section 6: Payments & Your MOTD Account
  {
    id: "pa-1",
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Which payment methods do you accept?",
    questionAr: "ما هي طرق الدفع التي تقبلونها؟",
    answerEn:
      "MOTD accepts major debit and credit cards, including Visa and Mastercard, as well as Apple Pay. Additional payment methods available at checkout will be displayed during the payment process.",
    answerAr:
      "تقبل MOTD بطاقات الخصم والائتمان الرئيسية، بما في ذلك فيزا وماستركارد، بالإضافة إلى Apple Pay. سيتم عرض طرق الدفع الإضافية المتاحة عند الدفع أثناء عملية الدفع.",
  },
  {
    id: "pa-2",
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Do you accept Cash on Delivery (COD)?",
    questionAr: "هل تقبلون الدفع عند الاستلام؟",
    answerEn:
      "At this time, MOTD does not offer Cash on Delivery.\n\nAll orders must be paid online before production begins.\n\nThis allows us to confirm your order immediately and begin creating your Mukhawar without delay.",
    answerAr:
      "في الوقت الحالي، لا تقدم MOTD خدمة الدفع عند الاستلام.\n\nيجب دفع جميع الطلبات عبر الإنترنت قبل بدء الإنتاج.\n\nهذا يسمح لنا بتأكيد طلبك فوراً والبدء في إنشاء المخوار الخاص بك دون تأخير.",
  },
  {
    id: "pa-3",
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Is my payment secure?",
    questionAr: "هل مدفوعاتي آمنة؟",
    answerEn:
      "Yes.\n\nAll payments are processed through secure, encrypted payment gateways that meet industry security standards.\n\nMOTD does not store your full payment card details.",
    answerAr:
      "نعم.\n\nتتم معالجة جميع المدفوعات من خلال بوابات دفع آمنة ومشفرة تلبي معايير الأمان الصناعية.\n\nلا تقوم MOTD بتخزين تفاصيل بطاقة الدفع الكاملة الخاصة بك.",
  },
  {
    id: "pa-4",
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "When will my payment be charged?",
    questionAr: "متى سيتم خصم مدفوعاتي؟",
    answerEn:
      "Payment is collected at the time your order is placed.\n\nOnce your payment has been successfully processed, you'll receive an order confirmation by email.",
    answerAr:
      "يتم تحصيل الدفع في وقت تقديم طلبك.\n\nبمجرد معالجة دفعتك بنجاح، ستتلقى تأكيداً بالطلب عبر البريد الإلكتروني.",
  },
  {
    id: "pa-5",
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Can I pay in instalments?",
    questionAr: "هل يمكنني الدفع بالتقسيط؟",
    answerEn:
      "Installment payment options may be available through selected payment providers at checkout.",
    answerAr:
      "قد تكون خيارات الدفع بالتقسيط متاحة من خلال مزودي الدفع المختارين عند الدفع.",
  },
  {
    id: "pa-6",
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Can I save my payment card for future purchases?",
    questionAr: "هل يمكنني حفظ بطاقة الدفع الخاصة بي للمشتريات المستقبلية؟",
    answerEn:
      "If available, you may securely save your preferred payment method for faster checkout.\n\nPayment information is stored securely by our payment provider—not by MOTD.",
    answerAr:
      "إذا كان متاحاً، يمكنك حفظ طريقة الدفع المفضلة لديك بشكل آمن لإتمام الدفع بشكل أسرع.\n\nيتم تخزين معلومات الدفع بشكل آمن من قبل مزود الدفع لدينا - وليس بواسطة MOTD.",
  },
  {
    id: "pa-7",
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Can I use a discount code?",
    questionAr: "هل يمكنني استخدام رمز خصم؟",
    answerEn:
      "Yes.\n\nIf you have a valid promotional code, you can enter it during checkout before completing your payment.\n\nAny eligible discount will be applied automatically.",
    answerAr:
      "نعم.\n\nإذا كان لديك رمز ترويجي صالح، يمكنك إدخاله أثناء الدفع قبل إتمام عملية الدفع.\n\nسيتم تطبيق أي خصم مؤهل تلقائياً.",
  },
  {
    id: "pa-8",
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Can I use more than one promo code?",
    questionAr: "هل يمكنني استخدام أكثر من رمز ترويجي؟",
    answerEn:
      "Unless otherwise stated, only one promotional code can be used per order.",
    answerAr:
      "ما لم يُنص على خلاف ذلك، يمكن استخدام رمز ترويجي واحد فقط لكل طلب.",
  },
  {
    id: "pa-9",
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Why isn't my promo code working?",
    questionAr: "لماذا لا يعمل رمز الترويج الخاص بي؟",
    answerEn:
      "A promotional code may not work if:\n• It has expired.\n• Minimum purchase requirements haven't been met.\n• It only applies to selected products.\n• It has already been used.\n• Another promotion has already been applied.\n\nIf you believe your code should be valid, please contact care@motd.ae.",
    answerAr:
      "قد لا يعمل رمز الترويج إذا:\n• انتهت صلاحيته.\n• لم يتم استيفاء الحد الأدنى لمتطلبات الشراء.\n• ينطبق فقط على منتجات محددة.\n• تم استخدامه بالفعل.\n• تم تطبيق عرض ترويجي آخر بالفعل.\n\nإذا كنت تعتقد أن رمزك يجب أن يكون صالحاً، يرجى الاتصال بـ care@motd.ae.",
  },
  {
    id: "pa-10",
    sectionId: "section-6",
    chatTopicId: "chat-account",
    questionEn: "Why should I create a MOTD account?",
    questionAr: "لماذا يجب عليّ إنشاء حساب MOTD؟",
    answerEn:
      "Creating an account allows you to:\n• Save your measurements.\n• Save multiple family profiles.\n• Save favourite designs and fabrics.\n• Track your orders.\n• Reorder previous creations.\n• Manage your addresses.\n• Enjoy a faster checkout experience.",
    answerAr:
      "يتيح لك إنشاء حساب:\n• حفظ قياساتك.\n• حفظ ملفات متعددة لأفراد العائلة.\n• حفظ التصاميم والأقمشة المفضلة.\n• تتبع طلباتك.\n• إعادة طلب الإبداعات السابقة.\n• إدارة عناوينك.\n• الاستمتاع بتجربة دفع أسرع.",
  },
  {
    id: "pa-11",
    sectionId: "section-6",
    chatTopicId: "chat-wardrobe",
    questionEn: "What is My Wardrobe?",
    questionAr: "ما هي خزانة ملابسي؟",
    answerEn:
      "My Wardrobe is your personal space within MOTD.\n\nHere you'll find everything you've saved and ordered in one beautifully organised place.",
    answerAr:
      "خزانة ملابسي هي مساحتك الشخصية داخل MOTD.\n\nستجد هنا كل ما حفظته وطلبته في مكان واحد منظم بشكل جميل.",
  },
  {
    id: "pa-12",
    sectionId: "section-6",
    chatTopicId: "chat-wardrobe",
    questionEn: "What can I find inside My Wardrobe?",
    questionAr: "ماذا يمكنني أن أجد داخل خزانة ملابسي؟",
    answerEn:
      "My Wardrobe includes:\n• Saved Designs\n• Saved Fabrics\n• Measurement Profiles\n• Order History\n• Saved Addresses\n• Account Settings\n• Wishlist",
    answerAr:
      "تتضمن خزانة ملابسي:\n• التصاميم المحفوظة\n• الأقمشة المحفوظة\n• ملفات القياسات\n• سجل الطلبات\n• العناوين المحفوظة\n• إعدادات الحساب\n• قائمة الرغبات",
  },
  {
    id: "pa-13",
    sectionId: "section-6",
    chatTopicId: "chat-wardrobe",
    questionEn: "Can I save designs or fabrics without purchasing them?",
    questionAr: "هل يمكنني حفظ التصاميم أو الأقمشة دون شرائها؟",
    answerEn:
      "Yes.\n\nSimply tap the ♡ icon on any design, fabric, or Ready to Order piece to add it to your Wishlist. You can revisit your saved favourites anytime and continue whenever you're ready.",
    answerAr:
      "نعم.\n\nما عليك سوى النقر على أيقونة ♡ على أي تصميم أو قماش أو قطعة جاهزة للطلب لإضافتها إلى قائمة رغباتك. يمكنك العودة إلى مفضلاتك المحفوظة في أي وقت والمتابعة عندما تكون مستعداً.",
  },
  {
    id: "pa-14",
    sectionId: "section-6",
    chatTopicId: "chat-wardrobe",
    questionEn: "Can I save complete Mukhawar ideas?",
    questionAr: "هل يمكنني حفظ أفكار مخوار كاملة؟",
    answerEn:
      "Yes.\n\nOnce you've created your Mukhawar, you can save it to your Cart or Wishlist and return to it whenever you're ready to place your order.",
    answerAr:
      "نعم.\n\nبمجرد إنشاء المخوار الخاص بك، يمكنك حفظه في سلة التسوق أو قائمة الرغبات والعودة إليه في أي وقت تكون فيه مستعداً لتقديم طلبك.",
  },
  {
    id: "pa-15",
    sectionId: "section-6",
    chatTopicId: "chat-wardrobe",
    questionEn: "Can I duplicate a previous creation?",
    questionAr: "هل يمكنني نسخ إبداع سابق؟",
    answerEn:
      "Absolutely.\n\nYou can duplicate any previous creation and make changes such as selecting a different fabric or design without starting again from the beginning.",
    answerAr:
      "بالتأكيد.\n\nيمكنك نسخ أي إبداع سابق وإجراء تغييرات مثل اختيار قماش أو تصميم مختلف دون البدء من جديد.",
  },
  {
    id: "pa-16",
    sectionId: "section-6",
    chatTopicId: "chat-account",
    questionEn: "Can I change my email address or phone number?",
    questionAr: "هل يمكنني تغيير عنوان بريدي الإلكتروني أو رقم هاتفي؟",
    answerEn:
      "Yes.\n\nYour contact information can be updated anytime through your Account Settings.",
    answerAr:
      "نعم.\n\nيمكن تحديث معلومات الاتصال الخاصة بك في أي وقت من خلال إعدادات الحساب.",
  },
  {
    id: "pa-17",
    sectionId: "section-6",
    chatTopicId: "chat-account",
    questionEn: "I forgot my password. What should I do?",
    questionAr: "نسيت كلمة المرور الخاصة بي. ماذا أفعل؟",
    answerEn:
      "Select Forgot Password on the sign-in page and follow the instructions to securely reset your password.",
    answerAr:
      "حدد نسيت كلمة المرور على صفحة تسجيل الدخول واتبع التعليمات لإعادة تعيين كلمة المرور الخاصة بك بشكل آمن.",
  },
  {
    id: "pa-18",
    sectionId: "section-6",
    chatTopicId: "chat-support",
    questionEn: "How does MOTD protect my personal information?",
    questionAr: "كيف تحمي MOTD معلوماتي الشخصية؟",
    answerEn:
      "Your privacy is important to us.\n\nPersonal information is securely stored and only used to process your orders and improve your experience with MOTD.\n\nPlease refer to our Privacy Policy for full details.",
    answerAr:
      "خصوصيتك مهمة بالنسبة لنا.\n\nيتم تخزين المعلومات الشخصية بشكل آمن واستخدامها فقط لمعالجة طلباتك وتحسين تجربتك مع MOTD.\n\nيرجى الرجوع إلى سياسة الخصوصية الخاصة بنا للحصول على التفاصيل الكاملة.",
  },
  {
    id: "gs-15",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-browse",
    questionEn: "Is MOTD available in Arabic?",
    questionAr: "هل MOTD متاحة باللغة العربية؟",
    answerEn:
      "Yes. MOTD is available in English and Arabic. Use the language switcher in the site header to change the language at any time.\n\nWhen you choose Arabic, the experience switches to right-to-left layout and Arabic content where available, including product names, filters, and guides.",
    answerAr:
      "نعم. تتوفر MOTD باللغتين الإنجليزية والعربية. استخدم مبدّل اللغة في ترويسة الموقع لتغيير اللغة في أي وقت.\n\nعند اختيار العربية، تتحول التجربة إلى تخطيط من اليمين إلى اليسار وإلى المحتوى العربي حيثما يتوفر، بما في ذلك أسماء المنتجات والفلاتر والأدلة.",
  },
  {
    id: "gs-16",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-browse",
    questionEn: "What currency are prices shown in?",
    questionAr: "بأي عملة تُعرض الأسعار؟",
    answerEn:
      "All prices on MOTD are shown in UAE Dirhams (AED). Checkout, cart totals, and order summaries use AED only.\n\nVAT and delivery fees are also calculated and displayed in AED before you pay.",
    answerAr:
      "تُعرض جميع الأسعار على MOTD بالدرهم الإماراتي (AED). تستخدم عملية الدفع وإجمالي السلة وملخصات الطلبات الدرهم الإماراتي فقط.\n\nكما تُحسب رسوم ضريبة القيمة المضافة والتوصيل وتُعرض بالدرهم الإماراتي قبل الدفع.",
  },
  {
    id: "gs-17",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-rto",
    questionEn: "What is the difference between Made to Order and Ready to Order?",
    questionAr: "ما الفرق بين التفصيل حسب الطلب والجاهز للطلب؟",
    answerEn:
      "Made to Order lets you create a Mukhawar by choosing a design, fabric (or providing your own), tailor, and measurements. Production begins after payment and follows a custom creation journey.\n\nReady to Order pieces are already made and sold from the Ready to Order collection for faster delivery. They are clearly labelled on product pages and listed under Ready to Order.",
    answerAr:
      "يتيح لك التفصيل حسب الطلب إنشاء مخوار باختيار التصميم والقماش (أو توفير قماشك الخاص) والخياط والقياسات. يبدأ الإنتاج بعد الدفع ويتبع مسار إنشاء مخصص.\n\nأما القطع الجاهزة للطلب فهي جاهزة ومُصنَّعة مسبقاً وتُباع من مجموعة الجاهز للطلب لتوصيل أسرع. وهي موضّحة بوضوح على صفحات المنتجات ومُدرجة تحت الجاهز للطلب.",
  },
  {
    id: "gs-18",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-rto",
    questionEn: "What exactly are Ready to Order pieces?",
    questionAr: "ما هي القطع الجاهزة للطلب تحديداً؟",
    answerEn:
      "Ready to Order (Ready-Made) pieces are finished garments that have been listed for sale after coming from a previous custom tailoring order—often due to sizing issues.\n\nProduct pages may show condition details, the return reason where available, and links to the original fabric and design so you can explore or recreate a similar custom order.",
    answerAr:
      "القطع الجاهزة للطلب (الجاهزة) هي ملابس مكتملة أُدرجت للبيع بعد أن جاءت من طلب تفصيل مخصص سابق—غالباً بسبب مشاكل في المقاس.\n\nقد تعرض صفحات المنتجات تفاصيل الحالة وسبب الإرجاع حيث يتوفر، وروابط إلى القماش والتصميم الأصليين حتى تتمكني من استكشافهما أو إعادة إنشاء طلب مخصص مشابه.",
  },
  {
    id: "gs-19",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-addons",
    questionEn: "What are add-ons on MOTD?",
    questionAr: "ما هي الإضافات على MOTD؟",
    answerEn:
      "Add-ons are accessories and complementary products you can buy on their own or include while creating a custom Mukhawar.\n\nYou can browse the Add-ons section, filter by category, colour, material, season and more, then add items to your cart—or select compatible add-ons during the custom-order review step when fabric is purchased through MOTD.",
    answerAr:
      "الإضافات هي إكسسوارات ومنتجات مكملة يمكنك شراؤها بمفردها أو تضمينها أثناء إنشاء مخوار مخصص.\n\nيمكنك تصفح قسم الإضافات، والتصفية حسب الفئة واللون والخامة والموسم والمزيد، ثم إضافة العناصر إلى سلتك—أو اختيار إضافات متوافقة أثناء خطوة مراجعة الطلب المخصص عندما يُشترى القماش عبر MOTD.",
  },
  {
    id: "gs-20",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-brands",
    questionEn: "Can I browse fabric brands and tailor brands?",
    questionAr: "هل يمكنني تصفح علامات الأقمشة وعلامات الخياطين؟",
    answerEn:
      "Yes. The Brands section brings together fabric shops and tailor shops featured on MOTD.\n\nYou can search, filter by fabric or tailor partners, and open a brand profile to explore their fabrics, designs, ratings, and reviews.",
    answerAr:
      "نعم. يجمع قسم العلامات التجارية بين محلات الأقمشة ومحلات الخياطين المعروضة على MOTD.\n\nيمكنك البحث والتصفية حسب شركاء الأقمشة أو الخياطة، وفتح ملف علامة تجارية لاستكشاف أقمشتها وتصاميمها وتقييماتها ومراجعاتها.",
  },
  {
    id: "gs-21",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-account",
    questionEn: "Do I need an account to create a custom Mukhawar?",
    questionAr: "هل أحتاج إلى حساب لإنشاء مخوار مخصص؟",
    answerEn:
      "To complete a custom Mukhawar, you'll need to sign in before the measurements step so we can save and apply your measurement profile securely.\n\nYou can still browse designs, fabrics, and Ready to Order items as a guest. Retail purchases (fabrics, Ready to Order, add-ons) can be completed with guest checkout and email verification.",
    answerAr:
      "لإكمال مخوار مخصص، ستحتاجين إلى تسجيل الدخول قبل خطوة القياسات حتى نتمكن من حفظ ملف قياساتك وتطبيقه بأمان.\n\nيمكنكِ مع ذلك تصفح التصاميم والأقمشة والقطع الجاهزة للطلب كزائرة. ويمكن إكمال مشتريات التجزئة (الأقمشة، الجاهز للطلب، الإضافات) عبر الدفع كزائرة مع التحقق من البريد الإلكتروني.",
  },
  {
    id: "gs-22",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-account",
    questionEn: "Can I sign in with Google?",
    questionAr: "هل يمكنني تسجيل الدخول باستخدام Google؟",
    answerEn:
      "Yes. On the sign-in and registration pages you can continue with Google as well as email and password.\n\nGoogle sign-in helps you access your account quickly while still enjoying the same wardrobe, orders, and measurement features once you're signed in.",
    answerAr:
      "نعم. في صفحتي تسجيل الدخول والتسجيل يمكنكِ المتابعة باستخدام Google بالإضافة إلى البريد الإلكتروني وكلمة المرور.\n\nيساعدك تسجيل الدخول عبر Google على الوصول إلى حسابك بسرعة مع الاستمرار في الاستمتاع بنفس ميزات الخزانة والطلبات والقياسات بعد تسجيل الدخول.",
  },
  {
    id: "gs-23",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "Where is MOTD's head office?",
    questionAr: "أين يقع المكتب الرئيسي لـ MOTD؟",
    answerEn:
      "MOTD is based in Dubai, United Arab Emirates. Our head office is at D3, Dubai Design District.\n\nFor day-to-day help, email care@motd.ae or reach us on WhatsApp during Care Team hours.",
    answerAr:
      "تقع MOTD في دبي، الإمارات العربية المتحدة. مكتبنا الرئيسي في D3، حي دبي للتصميم.\n\nللمساعدة اليومية، راسلي care@motd.ae أو تواصلي معنا عبر واتساب خلال ساعات عمل فريق الرعاية.",
  },
  {
    id: "gs-24",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-support",
    questionEn: "Where can I find help beyond this FAQ?",
    questionAr: "أين يمكنني الحصول على مساعدة خارج هذه الأسئلة الشائعة؟",
    answerEn:
      "Visit the Support page for email, phone, and office details, or open the MOTD Guide for shipping, returns, measurements, and ordering help.\n\nOur Care Team aims to respond to emails within about 24 hours.",
    answerAr:
      "زوري صفحة الدعم لمعرفة تفاصيل البريد الإلكتروني والهاتف والمكتب، أو افتحي دليل MOTD للمساعدة في الشحن والإرجاع والقياسات والطلب.\n\nيهدف فريق الرعاية لدينا إلى الرد على رسائل البريد الإلكتروني خلال حوالي 24 ساعة.",
  },
  {
    id: "gs-25",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-browse",
    questionEn: "Does MOTD use cookies?",
    questionAr: "هل تستخدم MOTD ملفات تعريف الارتباط (الكوكيز)؟",
    answerEn:
      "Yes. Essential cookies and local storage power account, cart, wishlist, and custom-order draft features.\n\nAnalytics cookies are optional and only load if you accept them on the cookie banner. You can review details on the Cookie Policy page and change your preference anytime.",
    answerAr:
      "نعم. تُشغّل ملفات تعريف الارتباط الأساسية والتخزين المحلي ميزات الحساب والسلة وقائمة الرغبات ومسودة الطلب المخصص.\n\nملفات تعريف الارتباط التحليلية اختيارية ولا تُحمَّل إلا إذا وافقتِ عليها في بانر الكوكيز. يمكنكِ مراجعة التفاصيل في صفحة سياسة ملفات تعريف الارتباط وتغيير تفضيلك في أي وقت.",
  },
  {
    id: "gs-26",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-support",
    questionEn: "Can I leave reviews on MOTD?",
    questionAr: "هل يمكنني ترك تقييمات على MOTD؟",
    answerEn:
      "Yes. After an order is delivered, you can leave a review for eligible products from your account.\n\nVerified purchase reviews may appear on design, fabric shop, Ready to Order, and related product pages to help other customers.",
    answerAr:
      "نعم. بعد تسليم الطلب، يمكنكِ ترك تقييم للمنتجات المؤهلة من حسابك.\n\nقد تظهر تقييمات الشراء الموثّق على صفحات التصميم ومحل الأقمشة والجاهز للطلب والمنتجات ذات الصلة لمساعدة العملاء الآخرين.",
  },
  {
    id: "gs-27",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-about",
    questionEn: "What can I shop for on MOTD besides custom Mukhawars?",
    questionAr: "ماذا يمكنني التسوق له على MOTD إلى جانب المخوارات المخصصة؟",
    answerEn:
      "Besides Made to Order Mukhawars, you can shop fabrics by the cut, Ready to Order pieces, and add-ons.\n\nEach path has its own catalogue, filters, and checkout flow, and you can mix retail items in one cart where stock allows.",
    answerAr:
      "إلى جانب مخوارات التفصيل حسب الطلب، يمكنكِ تسوق الأقمشة بالقصّات والقطع الجاهزة للطلب والإضافات.\n\nلكل مسار كتالوج وفلاتر ومسار دفع خاص به، ويمكنكِ دمج عناصر التجزئة في سلة واحدة حيث يسمح المخزون.",
  },
  {
    id: "gs-28",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-browse",
    questionEn: "How do I know if something is in stock?",
    questionAr: "كيف أعرف إذا كان المنتج متوفراً في المخزون؟",
    answerEn:
      "Product and fabric pages show availability based on current stock. Fabric is sold in predefined cuts with piece stock; if a cut has no stock, you won't be able to add it.\n\nReady to Order and add-on items show stock on the listing and detail pages, including sold-out states when none remain.",
    answerAr:
      "تعرض صفحات المنتجات والأقمشة التوفر بناءً على المخزون الحالي. تُباع الأقمشة بقصّات محددة مسبقاً مع مخزون لكل قطعة؛ إذا لم يكن للقصّة مخزون فلن تتمكني من إضافتها.\n\nتعرض عناصر الجاهز للطلب والإضافات المخزون في صفحات القائمة والتفاصيل، بما في ذلك حالات نفاد المخزون عندما لا يتبقى شيء.",
  },
  {
    id: "gs-29",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-browse",
    questionEn: "Can I filter catalogues by colour, season, or material?",
    questionAr: "هل يمكنني تصفية الكتالوجات حسب اللون أو الموسم أو الخامة؟",
    answerEn:
      "Yes. Designs, fabrics, Ready to Order pieces, and add-ons support catalogue filters such as category, colour, material, pattern or design style, season, tags, price range, and in-stock only where available.\n\nUse filters on each shop page to narrow results to what suits you.",
    answerAr:
      "نعم. تدعم التصاميم والأقمشة والقطع الجاهزة للطلب والإضافات فلاتر الكتالوج مثل الفئة واللون والخامة والنمط أو أسلوب التصميم والموسم والوسوم ونطاق السعر والمتوفر فقط حيثما يتاح.\n\nاستخدمي الفلاتر في كل صفحة متجر لتضييق النتائج إلى ما يناسبك.",
  },
  {
    id: "gs-30",
    chatbotOnly: true,
    sectionId: "section-1",
    chatTopicId: "chat-account",
    questionEn: "What happens if I start creating a Mukhawar and leave the page?",
    questionAr: "ماذا يحدث إذا بدأتُ إنشاء مخوار ثم غادرت الصفحة؟",
    answerEn:
      "Your custom-order draft is saved locally so you can return and continue where you left off—fabric, tailor/design, meters, measurements, and review.\n\nWishlist and cart items are also kept on your device, and when you're signed in your cart can sync with your account across devices.",
    answerAr:
      "تُحفظ مسودة طلبك المخصص محلياً حتى تتمكني من العودة والمتابعة من حيث توقفتِ—القماش والخياط/التصميم والأمتار والقياسات والمراجعة.\n\nكما تُحفظ عناصر قائمة الرغبات والسلة على جهازك، وعندما تكونين مسجّلة الدخول يمكن مزامنة سلتك مع حسابك عبر الأجهزة.",
  },
  {
    id: "cm-17",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "What is a fabric cut?",
    questionAr: "ما هي قصّة القماش؟",
    answerEn:
      "Fabrics on MOTD are sold in predefined cuts—fixed lengths with their own price and stock—rather than as an open-ended tape measure.\n\nOn a fabric page or during the meters step of a custom order, you choose the cut length(s) you need. Each cut may be measured in meters or war.",
    answerAr:
      "تُباع الأقمشة على MOTD بقصّات محددة مسبقاً—أطوال ثابتة لكل منها سعرها ومخزونها—وليس كمتر مفتوح بلا حد.\n\nفي صفحة القماش أو أثناء خطوة الأمتار في الطلب المخصص، تختارين طول القصّة أو القصّات التي تحتاجينها. قد تُقاس كل قصّة بالأمتار أو بالوار.",
  },
  {
    id: "cm-18",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "What is \"war\" and how does it relate to meters?",
    questionAr: "ما هو «الوار» وكيف يرتبط بالأمتار؟",
    answerEn:
      "War is a traditional fabric length unit used alongside meters on MOTD. One war equals 0.9144 meters.\n\nWhere a cut is listed in war, we also show the meter equivalent so you can compare lengths easily while ordering.",
    answerAr:
      "الوار وحدة طول تقليدية للأقمشة تُستخدم إلى جانب الأمتار على MOTD. الوار الواحد يساوي 0.9144 متراً.\n\nعندما تُدرج قصّة بالوار، نعرض أيضاً المعادل بالمتر حتى تتمكني من مقارنة الأطوال بسهولة أثناء الطلب.",
  },
  {
    id: "cm-19",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "What happens to leftover fabric after my Mukhawar is made?",
    questionAr: "ماذا يحدث للقماش المتبقي بعد تفصيل مخواري؟",
    answerEn:
      "If you purchase more fabric than the design's minimum requirement, the leftover length is calculated on your order.\n\nLeftover fabric is returned to you with your finished Mukhawar—not kept by the tailor—so you can reuse it later.",
    answerAr:
      "إذا اشتريتِ قماشاً أكثر من الحد الأدنى المطلوب للتصميم، يُحسب الطول المتبقي على طلبك.\n\nيُعاد القماش المتبقي إليك مع المخوار النهائي—ولا يحتفظ به الخياط—حتى تتمكني من إعادة استخدامه لاحقاً.",
  },
  {
    id: "cm-20",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "Why does my design have a minimum fabric length?",
    questionAr: "لماذا يوجد حد أدنى لطول القماش لتصميمي؟",
    answerEn:
      "Each design has a minimum cut length (based on its estimated meters / minimum cut) needed to complete the embroidery and tailoring safely.\n\nDuring the meters step, MOTD checks that your selected cuts meet that minimum. If you're short, you'll be asked to add more fabric before continuing.",
    answerAr:
      "لكل تصميم حد أدنى لطول القصّة (بناءً على الأمتار التقديرية / الحد الأدنى للقصّة) اللازم لإكمال التطريز والخياطة بأمان.\n\nأثناء خطوة الأمتار، تتحقق MOTD من أن القصّات التي اخترتها تستوفي ذلك الحد الأدنى. إذا كان الطول ناقصاً، سيُطلب منك إضافة المزيد من القماش قبل المتابعة.",
  },
  {
    id: "cm-21",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "Can I select more than one fabric cut for a single Mukhawar?",
    questionAr: "هل يمكنني اختيار أكثر من قصّة قماش لمخوار واحد؟",
    answerEn:
      "Yes. When buying fabric through MOTD, you can combine multiple cut pieces so the total length meets or exceeds the design minimum.\n\nThe meters step shows your selected cuts, total length, and any leftover that will be returned with your finished order.",
    answerAr:
      "نعم. عند شراء القماش عبر MOTD، يمكنكِ الجمع بين عدة قطع قصّة بحيث يصل الطول الإجمالي إلى الحد الأدنى للتصميم أو يتجاوزه.\n\nتعرض خطوة الأمتار القصّات المختارة والطول الإجمالي وأي متبقي سيُعاد مع طلبك النهائي.",
  },
  {
    id: "cm-22",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "Can I add a pocket or a bottom wide fold to my Mukhawar?",
    questionAr: "هل يمكنني إضافة جيب أو طيّة سفلية عريضة لمخواري؟",
    answerEn:
      "Yes. On the custom-order review step, optional order options let you request \"Add a Pocket\" and/or \"Add a bottom wide fold.\"\n\nThese preferences are saved with your order so your selected tailor can include them during production.",
    answerAr:
      "نعم. في خطوة مراجعة الطلب المخصص، تتيح لك خيارات الطلب الاختيارية طلب «إضافة جيب» و/أو «إضافة طيّة سفلية عريضة».\n\nتُحفظ هذه التفضيلات مع طلبك حتى يتمكن الخياط المختار من تضمينها أثناء الإنتاج.",
  },
  {
    id: "cm-23",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-addons",
    questionEn: "Can I add accessories while creating a custom Mukhawar?",
    questionAr: "هل يمكنني إضافة إكسسوارات أثناء إنشاء مخوار مخصص؟",
    answerEn:
      "Yes. When you purchase fabric through MOTD, the review step can show add-ons from the relevant fabric shop(s) for you to include.\n\nSelected add-ons are priced into your order total (including VAT) and fulfilled alongside your custom journey according to the parcel plan.",
    answerAr:
      "نعم. عند شراء القماش عبر MOTD، يمكن لخطوة المراجعة أن تعرض إضافات من محل (محلات) الأقمشة ذات الصلة لتضمينها.\n\nتُضاف الإضافات المختارة إلى إجمالي طلبك (بما في ذلك ضريبة القيمة المضافة) وتُنفَّذ إلى جانب مسار التفصيل وفقاً لخطة الطرود.",
  },
  {
    id: "cm-24",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-pricing",
    questionEn: "How is my custom Mukhawar price calculated?",
    questionAr: "كيف يُحسب سعر المخوار المخصص الخاص بي؟",
    answerEn:
      "Your total typically combines the design base price, fabric cost (if purchased on MOTD), tailoring fee, delivery fee, and VAT.\n\nA live price preview appears on the review step before checkout so you can see each component before paying.",
    answerAr:
      "عادةً ما يجمع إجماليك بين السعر الأساسي للتصميم وتكلفة القماش (إذا اشتريته على MOTD) ورسوم الخياطة ورسوم التوصيل وضريبة القيمة المضافة.\n\nتظهر معاينة سعر مباشرة في خطوة المراجعة قبل الدفع حتى تري كل مكوّن قبل الدفع.",
  },
  {
    id: "cm-25",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-pricing",
    questionEn: "What does fixed vs per-meter design pricing mean?",
    questionAr: "ماذا يعني تسعير التصميم الثابت مقابل التسعير بالمتر؟",
    answerEn:
      "Some designs use a fixed base price, while others may be priced per meter depending on how the tailor set the design.\n\nEither way, the review and checkout steps show the calculated amounts for your selected design, fabric length, and tailoring fee before you confirm.",
    answerAr:
      "تستخدم بعض التصاميم سعراً أساسياً ثابتاً، بينما قد تُسعَّر أخرى بالمتر حسب كيفية ضبط الخياط للتصميم.\n\nفي كلتا الحالتين، تعرض خطوتا المراجعة والدفع المبالغ المحسوبة لتصميمك المختار وطول القماش ورسوم الخياطة قبل التأكيد.",
  },
  {
    id: "cm-26",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "Where do I see production time for a design?",
    questionAr: "أين أرى مدة الإنتاج لتصميم ما؟",
    answerEn:
      "Each design can display an estimated crafting time from the tailor (often in days or weeks).\n\nYou'll see timing guidance before you place the order; final estimated completion also appears on your order after confirmation.",
    answerAr:
      "يمكن لكل تصميم أن يعرض مدة تفصيل تقديرية من الخياط (غالباً بالأيام أو الأسابيع).\n\nسترين إرشادات التوقيت قبل تقديم الطلب؛ كما يظهر التقدير النهائي للإنجاز على طلبك بعد التأكيد.",
  },
  {
    id: "cm-27",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "How do I start an order from a fabric page?",
    questionAr: "كيف أبدأ طلباً من صفحة قماش؟",
    answerEn:
      "Open any fabric you like, choose an available cut, and either add it to your cart for fabric-only purchase or continue into the custom-order flow to pair it with a design and tailor.\n\nYou can also save the fabric to your wishlist and return later.",
    answerAr:
      "افتحي أي قماش يعجبك، واختاري قصّة متاحة، ثم أضيفيه إلى سلتك لشراء القماش فقط أو تابعي إلى مسار الطلب المخصص لربطه بتصميم وخياط.\n\nيمكنكِ أيضاً حفظ القماش في قائمة الرغبات والعودة لاحقاً.",
  },
  {
    id: "cm-28",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-designs",
    questionEn: "How do I start an order from a tailor or design page?",
    questionAr: "كيف أبدأ طلباً من صفحة خياط أو تصميم؟",
    answerEn:
      "Browse Tailors or Designs, open a design you love, then continue into the custom-order journey to choose fabric (or provide your own), confirm length, enter measurements, and review pricing.\n\nYou can also begin from a tailor profile to see the designs that tailor offers.",
    answerAr:
      "تصفحي الخياطين أو التصاميم، وافتحي تصميماً تحبينه، ثم تابعي إلى مسار الطلب المخصص لاختيار القماش (أو توفير قماشك)، وتأكيد الطول، وإدخال القياسات، ومراجعة الأسعار.\n\nيمكنكِ أيضاً البدء من ملف خياط لرؤية التصاميم التي يقدمها ذلك الخياط.",
  },
  {
    id: "cm-29",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "What if the fabric cut I want is out of stock?",
    questionAr: "ماذا لو كانت قصّة القماش التي أريدها غير متوفرة؟",
    answerEn:
      "Cuts with zero stock can't be selected for purchase. Choose another available cut length, another fabric, or provide your own fabric for a custom order.\n\nStock is checked again when you add to cart or place the order to keep availability accurate.",
    answerAr:
      "لا يمكن اختيار القصّات ذات المخزون الصفري للشراء. اختاري طول قصّة متاحاً آخر، أو قماشاً آخر، أو وفّري قماشك الخاص لطلب مخصص.\n\nيُفحص المخزون مرة أخرى عند الإضافة إلى السلة أو عند تقديم الطلب للحفاظ على دقة التوفر.",
  },
  {
    id: "cm-30",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-rto",
    questionEn: "Can Ready to Order pieces show the original fabric and design?",
    questionAr: "هل تعرض القطع الجاهزة للطلب القماش والتصميم الأصليين؟",
    answerEn:
      "Yes. Many Ready to Order detail pages include a \"Made with\" section linking to the source fabric and tailor design used for that piece.\n\nFrom there you can explore those items or start a new custom order inspired by the same combination.",
    answerAr:
      "نعم. تتضمن العديد من صفحات تفاصيل الجاهز للطلب قسماً بعنوان «صُنع باستخدام» يربط إلى القماش وتصميم الخياط المصدرين المستخدمين لتلك القطعة.\n\nمن هناك يمكنكِ استكشاف تلك العناصر أو بدء طلب مخصص جديد مستوحى من نفس التركيبة.",
  },
  {
    id: "cm-31",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-rto",
    questionEn: "Do Ready to Order listings show condition details?",
    questionAr: "هل تعرض قوائم الجاهز للطلب تفاصيل الحالة؟",
    answerEn:
      "Where available, Ready to Order pages display item info such as condition, return reason, and original design context.\n\nPlease read these details carefully before purchasing, as each piece is unique.",
    answerAr:
      "حيثما يتوفر، تعرض صفحات الجاهز للطلب معلومات القطعة مثل الحالة وسبب الإرجاع وسياق التصميم الأصلي.\n\nيرجى قراءة هذه التفاصيل بعناية قبل الشراء، فكل قطعة فريدة من نوعها.",
  },
  {
    id: "cm-32",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-addons",
    questionEn: "Can I buy add-ons without ordering a Mukhawar?",
    questionAr: "هل يمكنني شراء إضافات دون طلب مخوار؟",
    answerEn:
      "Yes. Browse Add-ons, open a product, choose quantity, and add it to your cart or use Buy Now.\n\nAdd-ons check out through the retail cart flow with the same UAE delivery and payment options as other retail items.",
    answerAr:
      "نعم. تصفحي الإضافات، وافتحي منتجاً، واختاري الكمية، ثم أضيفيه إلى سلتك أو استخدمي الشراء الآن.\n\nتُدفع الإضافات عبر مسار سلة التجزئة بنفس خيارات التوصيل والدفع داخل الإمارات مثل بقية عناصر التجزئة.",
  },
  {
    id: "cm-33",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "If I provide my own fabric, do I still choose meters or cuts?",
    questionAr: "إذا وفّرتُ قماشي الخاص، هل أختار الأمتار أو القصّات أيضاً؟",
    answerEn:
      "When you select Provide My Own Fabric, you don't purchase MOTD fabric cuts. You'll still complete the design, tailor, measurements, and review steps.\n\nAfter payment, MOTD arranges collection of your fabric and delivery to your selected tailor for production.",
    answerAr:
      "عند اختيار توفير قماشي الخاص، لا تشتري قصّات قماش من MOTD. ستكملين مع ذلك خطوات التصميم والخياط والقياسات والمراجعة.\n\nبعد الدفع، ترتب MOTD استلام قماشك وتوصيله إلى الخياط المختار للإنتاج.",
  },
  {
    id: "cm-34",
    chatbotOnly: true,
    sectionId: "section-2",
    chatTopicId: "chat-fabrics",
    questionEn: "Can I order fabric only and tailor it later?",
    questionAr: "هل يمكنني طلب القماش فقط وتفصيله لاحقاً؟",
    answerEn:
      "Yes. Add fabric cuts to your cart and complete a retail checkout without selecting a design or tailor.\n\nYou can later return to create a custom Mukhawar—using MOTD fabric again or providing fabric you already have.",
    answerAr:
      "نعم. أضيفي قصّات القماش إلى سلتك وأكملي دفع التجزئة دون اختيار تصميم أو خياط.\n\nيمكنكِ لاحقاً العودة لإنشاء مخوار مخصص—باستخدام قماش MOTD مجدداً أو بتوفير قماش لديكِ بالفعل.",
  },
  {
    id: "tm-18",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Do I need to be signed in to enter measurements?",
    questionAr: "هل يجب أن أكون مسجّلة الدخول لإدخال القياسات؟",
    answerEn:
      "Yes. The custom-order measurements step requires an account so we can load and save measurement profiles securely.\n\nIf you're not signed in, you'll be directed to log in and then returned to continue your order.",
    answerAr:
      "نعم. تتطلب خطوة قياسات الطلب المخصص حساباً حتى نتمكن من تحميل ملفات القياسات وحفظها بأمان.\n\nإذا لم تكوني مسجّلة الدخول، سيتم توجيهك لتسجيل الدخول ثم إعادتك لمتابعة طلبك.",
  },
  {
    id: "tm-19",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Which measurements do I need to provide?",
    questionAr: "ما القياسات التي أحتاج إلى تقديمها؟",
    answerEn:
      "Custom orders use a guided set of measurements, including shoulder width, neck width and depth, chest, waist, hips, arm length, sleeve opening, armhole height, total length, and cuff width and length.\n\nEach field has an illustration and hint in the measurement guide to help you measure accurately.",
    answerAr:
      "تستخدم الطلبات المخصصة مجموعة قياسات موجّهة، تشمل عرض الكتف وعرض الرقبة وعمقها والصدر والخصر والوركين وطول الذراع وفتحة الكم وارتفاع فتحة الإبط والطول الكلي وعرض الكُمّ وطوله.\n\nلكل حقل رسم توضيحي وتلميح في دليل القياسات لمساعدتك على القياس بدقة.",
  },
  {
    id: "tm-20",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "What unit are measurements entered in?",
    questionAr: "بأي وحدة تُدخل القياسات؟",
    answerEn:
      "Measurements are entered using the unit shown beside each field in the measurement form (centimetres in the guide).\n\nEnter positive values carefully and double-check before continuing—accurate numbers are essential for fit.",
    answerAr:
      "تُدخل القياسات بالوحدة الظاهرة بجانب كل حقل في نموذج القياسات (بالسنتيمتر في الدليل).\n\nأدخلي قيماً موجبة بعناية وتحققي مرتين قبل المتابعة—الأرقام الدقيقة أساسية للحصول على مقاس مناسب.",
  },
  {
    id: "tm-21",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "What does \"Who is this order for?\" mean during measurements?",
    questionAr: "ماذا يعني «لمن هذا الطلب؟» أثناء القياسات؟",
    answerEn:
      "On the measurements step you can choose Myself or a saved family member. Selecting a member loads that profile's saved measurements when available.\n\nThis makes it easier to order for daughters or other family members without re-entering numbers each time.",
    answerAr:
      "في خطوة القياسات يمكنكِ اختيار نفسي أو أحد أفراد العائلة المحفوظين. اختيار فرد يحمّل قياسات ذلك الملف المحفوظة عند توفرها.\n\nهذا يسهّل الطلب للبنات أو لأفراد العائلة الآخرين دون إعادة إدخال الأرقام في كل مرة.",
  },
  {
    id: "tm-22",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "How do I add a family member profile?",
    questionAr: "كيف أضيف ملف فرد من العائلة؟",
    answerEn:
      "From your account, open Add Members (family members) to create a profile with name, relationship, phone, and optional email and address.\n\nYou can then save measurements for that member and select them during future custom orders.",
    answerAr:
      "من حسابك، افتحي إضافة الأعضاء (أفراد العائلة) لإنشاء ملف يتضمن الاسم وصلة القرابة والهاتف والبريد الإلكتروني والعنوان اختياريين.\n\nيمكنكِ بعد ذلك حفظ قياسات ذلك الفرد واختياره أثناء الطلبات المخصصة المستقبلية.",
  },
  {
    id: "tm-23",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Can I delete a family member profile?",
    questionAr: "هل يمكنني حذف ملف فرد من العائلة؟",
    answerEn:
      "Yes. In your account's family members section you can remove a profile you no longer need.\n\nDeleting a profile does not change orders already placed with those measurements.",
    answerAr:
      "نعم. في قسم أفراد العائلة في حسابك يمكنكِ إزالة ملف لم تعودي بحاجة إليه.\n\nحذف الملف لا يغيّر الطلبات التي قُدّمت بالفعل بتلك القياسات.",
  },
  {
    id: "tm-24",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Can family member profiles include an address?",
    questionAr: "هل يمكن أن تتضمن ملفات أفراد العائلة عنواناً؟",
    answerEn:
      "Yes. Family member profiles can optionally store an address in addition to contact details and measurements.\n\nAddress fields are optional; you can still save measurements without adding a full address.",
    answerAr:
      "نعم. يمكن لملفات أفراد العائلة تخزين عنوان اختياري بالإضافة إلى تفاصيل الاتصال والقياسات.\n\nحقول العنوان اختيارية؛ يمكنكِ حفظ القياسات دون إضافة عنوان كامل.",
  },
  {
    id: "tm-25",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Will choosing a family member automatically fill my measurements?",
    questionAr: "هل يملأ اختيار فرد من العائلة قياساتي تلقائياً؟",
    answerEn:
      "Yes. When you select a family member (or yourself) on the measurements step, MOTD loads that profile's saved measurements into the form when they exist.\n\nYou can still edit any field before continuing if something needs updating.",
    answerAr:
      "نعم. عند اختيار فرد من العائلة (أو نفسك) في خطوة القياسات، تحمّل MOTD قياسات ذلك الملف المحفوظة في النموذج عند وجودها.\n\nيمكنكِ مع ذلك تعديل أي حقل قبل المتابعة إذا احتاج شيئاً إلى التحديث.",
  },
  {
    id: "tm-26",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Where do I manage measurement profiles outside checkout?",
    questionAr: "أين أدير ملفات القياسات خارج عملية الدفع؟",
    answerEn:
      "Open your account and go to Measurements to view and update saved measurements for yourself and family members.\n\nChanges apply to future orders only and won't alter Mukhawars already in production.",
    answerAr:
      "افتحي حسابك وانتقي إلى القياسات لعرض وتحديث القياسات المحفوظة لنفسك ولأفراد العائلة.\n\nتُطبَّق التغييرات على الطلبات المستقبلية فقط ولن تغيّر المخوارات التي هي قيد الإنتاج بالفعل.",
  },
  {
    id: "tm-27",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Are measurement notes required?",
    questionAr: "هل ملاحظات القياسات مطلوبة؟",
    answerEn:
      "Notes are optional. You can add preferences or clarifications for the tailor in the notes field during measurements.\n\nOur team reviews notes with your order before production begins.",
    answerAr:
      "الملاحظات اختيارية. يمكنكِ إضافة تفضيلات أو توضيحات للخياط في حقل الملاحظات أثناء القياسات.\n\nيراجع فريقنا الملاحظات مع طلبك قبل بدء الإنتاج.",
  },
  {
    id: "tm-28",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Do the measurement diagrams cover body, neck, and sleeves?",
    questionAr: "هل تغطي رسوم القياسات الجسم والرقبة والأكمام؟",
    answerEn:
      "Yes. The custom-order guide groups measurements into body, neck, and sleeve sections, each with diagrams matching the numbered points on the guide image.\n\nFollow the on-screen hints for each numbered measurement as you fill the form.",
    answerAr:
      "نعم. يجمع دليل الطلب المخصص القياسات في أقسام الجسم والرقبة والأكمام، ولكل منها رسوم تطابق النقاط المرقّمة في صورة الدليل.\n\nاتّبعي التلميحات الظاهرة على الشاشة لكل قياس مرقّم أثناء ملء النموذج.",
  },
  {
    id: "tm-29",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "Can guests save measurement profiles?",
    questionAr: "هل يمكن للزوار حفظ ملفات القياسات؟",
    answerEn:
      "Measurement profiles are saved to a MOTD account. Guest checkout is available for retail items, but custom-order measurements require sign-in.\n\nCreate an account to store multiple profiles and reuse them on future Mukhawars.",
    answerAr:
      "تُحفظ ملفات القياسات في حساب MOTD. يتوفر الدفع كزائر لعناصر التجزئة، لكن قياسات الطلب المخصص تتطلب تسجيل الدخول.\n\nأنشئي حساباً لتخزين ملفات متعددة وإعادة استخدامها في المخوارات المستقبلية.",
  },
  {
    id: "tm-30",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn:
      "Can I use different measurement profiles for different Mukhawars in one order?",
    questionAr: "هل يمكنني استخدام ملفات قياسات مختلفة لمخوارات مختلفة في طلب واحد؟",
    answerEn:
      "Yes. When creating multiple custom pieces, each Mukhawar can use its own design, fabric, tailor, and measurement profile.\n\nSelect the correct family member (or yourself) on the measurements step for each creation so the right fit is used.",
    answerAr:
      "نعم. عند إنشاء عدة قطع مخصصة، يمكن لكل مخوار أن يستخدم تصميمه وقماشه وخياطه وملف قياساته الخاص.\n\nاختاري فرد العائلة الصحيح (أو نفسك) في خطوة القياسات لكل إبداع حتى يُستخدم المقاس المناسب.",
  },
  {
    id: "tm-31",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "What relationship details can I store for family members?",
    questionAr: "ما تفاصيل صلة القرابة التي يمكنني حفظها لأفراد العائلة؟",
    answerEn:
      "When adding a family member you can record their name and relationship along with phone and optional email.\n\nClear naming and relationship labels make it easier to pick the right profile at checkout.",
    answerAr:
      "عند إضافة فرد من العائلة يمكنكِ تسجيل الاسم وصلة القرابة مع الهاتف والبريد الإلكتروني الاختياري.\n\nالأسماء الواضحة وتسميات صلة القرابة تسهّل اختيار الملف الصحيح عند الدفع.",
  },
  {
    id: "tm-32",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-measurements",
    questionEn: "What if a saved profile has empty measurements?",
    questionAr: "ماذا لو كان لملف محفوظ قياسات فارغة؟",
    answerEn:
      "If a profile has no saved numbers yet, you can enter them during the order. MOTD won't wipe measurements you've already typed just because a profile is empty.\n\nAfter entering them, save the profile from your account so the next order is faster.",
    answerAr:
      "إذا لم يكن للملف أرقام محفوظة بعد، يمكنكِ إدخالها أثناء الطلب. لن تمسح MOTD القياسات التي كتبتها بالفعل لمجرد أن الملف فارغ.\n\nبعد إدخالها، احفظي الملف من حسابك ليكون الطلب التالي أسرع.",
  },
  {
    id: "tm-33",
    chatbotOnly: true,
    sectionId: "section-3",
    chatTopicId: "chat-brands",
    questionEn: "Can I see tailor ratings before I choose one?",
    questionAr: "هل يمكنني رؤية تقييمات الخياطين قبل اختيار أحدهم؟",
    answerEn:
      "Yes. Tailor profiles and the Brands listing can show ratings and review counts based on customer feedback.\n\nUse these together with the tailor's designs and description to choose the partner that suits you.",
    answerAr:
      "نعم. يمكن لملفات الخياطين وقائمة العلامات التجارية أن تعرض التقييمات وعدد المراجعات بناءً على ملاحظات العملاء.\n\nاستخدميها مع تصاميم الخياط ووصفه لاختيار الشريك الذي يناسبك.",
  },
  {
    id: "oj-17",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "What statuses does a custom order move through?",
    questionAr: "ما الحالات التي يمر بها الطلب المخصص؟",
    answerEn:
      "Custom orders progress through statuses such as pending, confirmed, fabric delivered, at tailor, in production, ready, out for delivery, and delivered.\n\nIf a return is submitted after delivery, you may also see return requested, return approved or rejected, and refund processed as MOTD reviews the request.",
    answerAr:
      "تتقدم الطلبات المخصصة عبر حالات مثل قيد الانتظار، مؤكد، تم تسليم القماش، لدى الخياط، قيد الإنتاج، جاهز، خرج للتوصيل، ومُسلَّم.\n\nإذا قُدّم طلب إرجاع بعد التسليم، قد ترين أيضاً طلب إرجاع، وإرجاع موافق عليه أو مرفوض، ومعالجة الاسترداد بينما تراجع MOTD الطلب.",
  },
  {
    id: "oj-18",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-rto",
    questionEn: "How is retail (Ready to Order / fabric / add-on) tracking different?",
    questionAr: "كيف يختلف تتبع التجزئة (الجاهز للطلب / القماش / الإضافة)؟",
    answerEn:
      "Retail orders follow a simpler journey: confirmed, shipped, delivered (and cancelled if applicable).\n\nYou'll still receive updates and can view status history from your account or the public tracking link sent after payment.",
    answerAr:
      "تتبع طلبات التجزئة مساراً أبسط: مؤكد، تم الشحن، مُسلَّم (ومُلغى إن وُجد).\n\nستستلمين التحديثات ويمكنكِ عرض سجل الحالة من حسابك أو رابط التتبع العام المُرسل بعد الدفع.",
  },
  {
    id: "oj-19",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Will I receive a tracking link after placing my order?",
    questionAr: "هل سأستلم رابط تتبع بعد تقديم طلبي؟",
    answerEn:
      "Yes. After a successful payment, MOTD provides a public order tracking URL tied to your order's tracking token.\n\nYou can open that link to follow status updates without needing to dig through emails.",
    answerAr:
      "نعم. بعد نجاح الدفع، توفر MOTD رابط تتبع عام للطلب مرتبط برمز التتبع الخاص بطلبك.\n\nيمكنكِ فتح ذلك الرابط لمتابعة تحديثات الحالة دون الحاجة للبحث في رسائل البريد.",
  },
  {
    id: "oj-20",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Can I track an order without logging in?",
    questionAr: "هل يمكنني تتبع طلب دون تسجيل الدخول؟",
    answerEn:
      "Yes. If you have the public tracking link from your order confirmation, you can open it to view progress for that order.\n\nSigned-in customers can also track everything from the Orders tab in their account.",
    answerAr:
      "نعم. إذا كان لديك رابط التتبع العام من تأكيد الطلب، يمكنكِ فتحه لعرض تقدم ذلك الطلب.\n\nيمكن للعملاء المسجّلين أيضاً تتبع كل شيء من تبويب الطلبات في حسابهم.",
  },
  {
    id: "oj-21",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Will I get in-app notifications when my order status changes?",
    questionAr: "هل سأحصل على إشعارات داخل التطبيق عند تغيّر حالة طلبي؟",
    answerEn:
      "Yes. Status changes such as confirmed, fabric delivered, in production, out for delivery, and delivered can create customer notifications.\n\nOpen the Notifications tab in your account to read them; delivered notifications may also invite you to leave a review.",
    answerAr:
      "نعم. يمكن لتغيّرات الحالة مثل مؤكد، تم تسليم القماش، قيد الإنتاج، خرج للتوصيل، ومُسلَّم أن تنشئ إشعارات للعميل.\n\nافتحي تبويب الإشعارات في حسابك لقراءتها؛ وقد تدعوك إشعارات التسليم أيضاً لترك تقييم.",
  },
  {
    id: "oj-22",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Can I mark my custom order as received?",
    questionAr: "هل يمكنني تعليم طلبي المخصص كمستلم؟",
    answerEn:
      "When a custom order is out for delivery and customer delivery isn't already being confirmed automatically by the courier shipment updates, you may see a Customer Received action on your order details.\n\nUse it only once you've taken possession of the package so your timeline stays accurate.",
    answerAr:
      "عندما يكون الطلب المخصص خرج للتوصيل ولم يتم تأكيد تسليم العميل تلقائياً بعد عبر تحديثات شحنة شركة التوصيل، قد ترين إجراء استلم العميل في تفاصيل طلبك.\n\nاستخدميه فقط بعد استلامك الطرد حتى تبقى خطّة الزمن دقيقة.",
  },
  {
    id: "oj-23",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-support",
    questionEn: "When can I leave a review?",
    questionAr: "متى يمكنني ترك تقييم؟",
    answerEn:
      "After delivery, eligible items from your order can be reviewed from My Reviews in your account.\n\nVerified purchase reviews help other customers and may appear on the related product or partner pages.",
    answerAr:
      "بعد التسليم، يمكن تقييم العناصر المؤهلة من طلبك من تقييماتي في حسابك.\n\nتساعد تقييمات الشراء الموثّق العملاء الآخرين وقد تظهر على صفحات المنتج أو الشريك ذات الصلة.",
  },
  {
    id: "oj-24",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-returns",
    questionEn: "Can I submit a return request from my custom order?",
    questionAr: "هل يمكنني تقديم طلب إرجاع من طلبي المخصص؟",
    answerEn:
      "Once a custom order is marked delivered, you can submit a return request from your order details with condition, reason, comments, and a pickup address.\n\nMOTD reviews each request. Made-to-measure items aren't eligible for standard change-of-mind returns; requests are for cases such as damage or fulfilment issues subject to review.",
    answerAr:
      "بمجرد تعليم الطلب المخصص كمُسلَّم، يمكنكِ تقديم طلب إرجاع من تفاصيل طلبك مع الحالة والسبب والتعليقات وعنوان الاستلام.\n\nتراجع MOTD كل طلب. القطع المفصّلة حسب المقاس غير مؤهلة لإرجاع تغيير الرأي القياسي؛ الطلبات مخصّصة لحالات مثل التلف أو مشاكل التنفيذ وتخضع للمراجعة.",
  },
  {
    id: "oj-25",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-wardrobe",
    questionEn: "Can I checkout only some items from my cart?",
    questionAr: "هل يمكنني الدفع لبعض العناصر فقط من سلتي؟",
    answerEn:
      "Yes. On the cart page you can select specific lines for a partial checkout instead of purchasing everything at once.\n\nUnselected items remain in your cart for later.",
    answerAr:
      "نعم. في صفحة السلة يمكنكِ تحديد بنود معيّنة لدفع جزئي بدلاً من شراء كل شيء دفعة واحدة.\n\nتبقى العناصر غير المحددة في سلتك لوقت لاحق.",
  },
  {
    id: "oj-26",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-wardrobe",
    questionEn: "What is Buy Now?",
    questionAr: "ما هو الشراء الآن؟",
    answerEn:
      "Buy Now takes a retail item (such as a Ready to Order piece or add-on) straight to checkout with that item ready for purchase.\n\nIt's a faster path when you don't need to keep browsing or building a larger cart first.",
    answerAr:
      "يأخذك الشراء الآن بعنصر تجزئة (مثل قطعة جاهزة للطلب أو إضافة) مباشرة إلى الدفع مع جاهزية ذلك العنصر للشراء.\n\nإنه مسار أسرع عندما لا تحتاجين إلى مواصلة التصفح أو بناء سلة أكبر أولاً.",
  },
  {
    id: "oj-27",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Will I receive an order confirmation email?",
    questionAr: "هل سأستلم بريداً إلكترونياً لتأكيد الطلب؟",
    answerEn:
      "Yes. After payment succeeds, MOTD confirms the order and you'll receive confirmation details by email for the address used at checkout.\n\nKeep that email—it includes helpful references for tracking and Care Team support.",
    answerAr:
      "نعم. بعد نجاح الدفع، تؤكد MOTD الطلب وستستلمين تفاصيل التأكيد بالبريد الإلكتروني للعنوان المستخدم عند الدفع.\n\nاحتفظي بذلك البريد—فهو يتضمن مراجع مفيدة للتتبع ودعم فريق الرعاية.",
  },
  {
    id: "oj-28",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-fabrics",
    questionEn: "Can my order show leftover fabric meters?",
    questionAr: "هل يمكن أن يعرض طلبي أمتار القماش المتبقية؟",
    answerEn:
      "Yes. Custom orders that purchase MOTD fabric store leftover meters when you ordered more than the design minimum.\n\nYou'll see leftover information on order review and order details, and that fabric is returned with your finished garment.",
    answerAr:
      "نعم. تخزّن الطلبات المخصصة التي تشتري قماش MOTD الأمتار المتبقية عندما تطلبين أكثر من الحد الأدنى للتصميم.\n\nسترين معلومات المتبقي في مراجعة الطلب وتفاصيل الطلب، ويُعاد ذلك القماش مع الثوب النهائي.",
  },
  {
    id: "oj-29",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "Why might my order involve more than one delivery parcel?",
    questionAr: "لماذا قد يتضمن طلبي أكثر من طرد توصيل واحد؟",
    answerEn:
      "Depending on what you ordered—custom Mukhawar, fabric legs, add-ons, or retail items—MOTD plans parcels between fabric shops, tailors, MOTD, and you.\n\nDelivery fees are based on billable customer delivery parcels, so combining different item types can affect the shipping line shown at checkout.",
    answerAr:
      "حسب ما طلبتِه—مخوار مخصص، مراحل القماش، إضافات، أو عناصر تجزئة—تخطط MOTD الطرود بين محلات الأقمشة والخياطين وMOTD وأنتِ.\n\nتُبنى رسوم التوصيل على طرود توصيل العميل القابلة للفوترة، لذا قد يؤثر دمج أنواع عناصر مختلفة على بند الشحن الظاهر عند الدفع.",
  },
  {
    id: "oj-30",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-account",
    questionEn: "What can guest customers see in My Account?",
    questionAr: "ماذا يمكن لعملاء الزيارة رؤيةه في حسابي؟",
    answerEn:
      "Guest checkout users can access Orders and Reviews related to their purchases.\n\nFull wardrobe features—favourites, notifications, saved measurements, family members, and settings—require a registered MOTD account.",
    answerAr:
      "يمكن لمستخدمي الدفع كزائر الوصول إلى الطلبات والتقييمات المتعلقة بمشترياتهم.\n\nميزات الخزانة الكاملة—المفضلات والإشعارات والقياسات المحفوظة وأفراد العائلة والإعدادات—تتطلب حساب MOTD مسجّلاً.",
  },
  {
    id: "oj-31",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-orders",
    questionEn: "How do courier tracking updates work?",
    questionAr: "كيف تعمل تحديثات تتبع شركة التوصيل؟",
    answerEn:
      "MOTD uses Shipa for logistics. Once parcels are created, shipment statuses and tracking URLs update as the courier progresses.\n\nThose updates help move your order timeline (for example toward out for delivery and delivered) and power the tracking information you receive.",
    answerAr:
      "تستخدم MOTD Shipa للخدمات اللوجستية. بمجرد إنشاء الطرود، تتحدث حالات الشحن وروابط التتبع مع تقدّم شركة التوصيل.\n\nتساعد تلك التحديثات على تحريك خطّة زمنية لطلبك (مثلاً نحو خرج للتوصيل ومُسلَّم) وتشغّل معلومات التتبع التي تستلمينها.",
  },
  {
    id: "oj-32",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-pricing",
    questionEn: "Can I see pricing breakdowns after I order?",
    questionAr: "هل يمكنني رؤية تفصيل الأسعار بعد الطلب؟",
    answerEn:
      "Yes. Order details and the public tracking page can show pricing components such as items, shipping, VAT, and totals where available.\n\nFor custom orders you may also see fabric meters, leftover meters, selected cuts, and add-ons included in the order.",
    answerAr:
      "نعم. يمكن لتفاصيل الطلب وصفحة التتبع العامة أن تعرض مكوّنات التسعير مثل العناصر والشحن وضريبة القيمة المضافة والإجماليات حيثما تتوفر.\n\nللطلبات المخصصة قد ترين أيضاً أمتار القماش والأمتار المتبقية والقصّات المختارة والإضافات المدرجة في الطلب.",
  },
  {
    id: "oj-33",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-pricing",
    questionEn: "What happens if payment fails?",
    questionAr: "ماذا يحدث إذا فشل الدفع؟",
    answerEn:
      "If card or Apple Pay payment doesn't complete, the order isn't confirmed for production. You can return to checkout and try again with a valid payment method.\n\nYour draft or cart items remain available so you don't have to rebuild the order from scratch.",
    answerAr:
      "إذا لم يكتمل الدفع بالبطاقة أو Apple Pay، لا يُؤكَّد الطلب للإنتاج. يمكنكِ العودة إلى الدفع والمحاولة مجدداً بطريقة دفع صالحة.\n\nتبقى مسودتك أو عناصر سلتك متاحة حتى لا تضطرّي إلى إعادة بناء الطلب من الصفر.",
  },
  {
    id: "oj-34",
    chatbotOnly: true,
    sectionId: "section-4",
    chatTopicId: "chat-designs",
    questionEn: "Do pocket and bottom-fold options appear on my order for the tailor?",
    questionAr: "هل تظهر خيارات الجيب والطيّة السفلية على طلبي للخياط؟",
    answerEn:
      "Yes. If you select Add a Pocket or Add a bottom wide fold on review, those flags are stored on the custom order.\n\nYour tailor sees them with the order details so finishing matches what you requested.",
    answerAr:
      "نعم. إذا اخترتِ إضافة جيب أو إضافة طيّة سفلية عريضة في المراجعة، تُحفظ تلك العلامات على الطلب المخصص.\n\nيراها خياطك مع تفاصيل الطلب حتى يطابق التشطيب ما طلبتِه.",
  },
  {
    id: "dr-18",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "How is my delivery fee calculated?",
    questionAr: "كيف تُحسب رسوم التوصيل الخاصة بي؟",
    answerEn:
      "Delivery is calculated at checkout from MOTD's parcel plan for your order. A per-parcel delivery fee (configured in platform settings, commonly AED 30 per billable delivery parcel) is applied to customer delivery legs.\n\nThe exact shipping amount is always shown before you pay.",
    answerAr:
      "يُحسب التوصيل عند الدفع من خطة طرود MOTD لطلبك. تُطبَّق رسوم توصيل لكل طرد (مُعدّة في إعدادات المنصة، وغالباً 30 درهماً لكل طرد توصيل قابل للفوترة) على مراحل توصيل العميل.\n\nيُعرض مبلغ الشحن الدقيق دائماً قبل الدفع.",
  },
  {
    id: "dr-19",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Which UAE emirates can I ship to?",
    questionAr: "إلى أي إمارات الإمارات العربية المتحدة يمكنني الشحن؟",
    answerEn:
      "Checkout delivery addresses use official UAE emirates. You'll select your emirate from the supported list when entering or choosing an address.\n\nMOTD currently fulfils customer deliveries within the United Arab Emirates.",
    answerAr:
      "تستخدم عناوين التوصيل عند الدفع إمارات الإمارات الرسمية. ستختارين إمارتك من القائمة المدعومة عند إدخال عنوان أو اختياره.\n\nتنفّذ MOTD حالياً توصيلات العملاء داخل دولة الإمارات العربية المتحدة.",
  },
  {
    id: "dr-20",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Can I ship to an address that isn't my default saved address?",
    questionAr: "هل يمكنني الشحن إلى عنوان غير عنواني المحفوظ الافتراضي؟",
    answerEn:
      "Yes. At checkout you can enter a new delivery address or pick from saved profile addresses.\n\nThis is useful for gifts or when someone else will receive the order at another UAE location.",
    answerAr:
      "نعم. عند الدفع يمكنكِ إدخال عنوان توصيل جديد أو الاختيار من عناوين الملف المحفوظة.\n\nهذا مفيد للهدايا أو عندما يستلم شخص آخر الطلب في موقع آخر داخل الإمارات.",
  },
  {
    id: "dr-21",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Can I save multiple delivery addresses?",
    questionAr: "هل يمكنني حفظ عدة عناوين توصيل؟",
    answerEn:
      "Yes. Signed-in customers can manage saved addresses in their account and choose a default for faster checkout.\n\nCustom checkout can also offer saved address options so you don't retype details each time.",
    answerAr:
      "نعم. يمكن للعملاء المسجّلين إدارة العناوين المحفوظة في حسابهم واختيار عنوان افتراضي لدفع أسرع.\n\nيمكن لعملية الدفع المخصصة أيضاً أن تعرض خيارات العناوين المحفوظة حتى لا تعيدي كتابة التفاصيل في كل مرة.",
  },
  {
    id: "dr-22",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Is postal code required for delivery?",
    questionAr: "هل الرمز البريدي مطلوب للتوصيل؟",
    answerEn:
      "Yes. UAE delivery forms require the standard address fields including emirate, city, street details, phone, and postal code so the courier can deliver accurately.\n\nPlease double-check these before placing your order.",
    answerAr:
      "نعم. تتطلب نماذج التوصيل في الإمارات حقول العنوان القياسية بما في ذلك الإمارة والمدينة وتفاصيل الشارع والهاتف والرمز البريدي حتى تتمكن شركة التوصيل من التسليم بدقة.\n\nيرجى التحقق مرتين من هذه البيانات قبل تقديم طلبك.",
  },
  {
    id: "dr-23",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Where do I find my shipment tracking number or courier link?",
    questionAr: "أين أجد رقم تتبع الشحنة أو رابط شركة التوصيل؟",
    answerEn:
      "Once parcels are handed to the courier, tracking details and tracking URLs are attached to the shipment and surfaced through your order timeline and notifications.\n\nYou can also use the public order tracking page linked after checkout for an overview of progress.",
    answerAr:
      "بمجرد تسليم الطرود لشركة التوصيل، تُرفق تفاصيل التتبع وروابط التتبع بالشحنة وتظهر عبر خطّة زمنية لطلبك والإشعارات.\n\nيمكنكِ أيضاً استخدام صفحة تتبع الطلب العامة المرتبطة بعد الدفع للحصول على نظرة عامة على التقدّم.",
  },
  {
    id: "dr-24",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "What information do I need to request a return?",
    questionAr: "ما المعلومات التي أحتاجها لطلب إرجاع؟",
    answerEn:
      "For eligible return requests from your order details, you'll provide item condition, a reason, optional comments, and a pickup address for collection.\n\nSubmit within the timeframe described in our returns guidance, and keep packaging and tags where required for Ready to Order items.",
    answerAr:
      "لطلبات الإرجاع المؤهلة من تفاصيل طلبك، ستقدّمين حالة القطعة وسبباً وتعليقات اختيارية وعنوان استلام للجمع.\n\nقدّمي الطلب ضمن الإطار الزمني الموضّح في إرشادات الإرجاع لدينا، واحتفظي بالتغليف والعلامات حيث يُطلب ذلك لعناصر الجاهز للطلب.",
  },
  {
    id: "dr-25",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "When can I request a return on a custom order?",
    questionAr: "متى يمكنني طلب إرجاع لطلب مخصص؟",
    answerEn:
      "A custom return request can be submitted after the order status is delivered. The request is then reviewed by MOTD (approved, rejected, or refund processed).\n\nStandard change-of-mind returns don't apply to made-to-measure pieces; contact Care promptly for damage or incorrect-item issues.",
    answerAr:
      "يمكن تقديم طلب إرجاع مخصص بعد أن تصبح حالة الطلب مُسلَّماً. ثم تراجع MOTD الطلب (موافق عليه، مرفوض، أو تمت معالجة الاسترداد).\n\nلا تنطبق عمليات إرجاع تغيير الرأي القياسية على القطع المفصّلة حسب المقاس؛ تواصلي مع الرعاية فوراً لمشاكل التلف أو العنصر غير الصحيح.",
  },
  {
    id: "dr-26",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "What happens after MOTD reviews my return request?",
    questionAr: "ماذا يحدث بعد مراجعة MOTD لطلب إرجاعي؟",
    answerEn:
      "If approved, MOTD coordinates the return logistics and moves the order through the return statuses toward refund processing when applicable.\n\nIf rejected, you'll see the return rejected status and can contact care@motd.ae if you need clarification.",
    answerAr:
      "إذا وُوفق عليه، تنسّق MOTD لوجستيات الإرجاع وتنقل الطلب عبر حالات الإرجاع نحو معالجة الاسترداد عند الاقتضاء.\n\nإذا رُفض، سترين حالة الإرجاع المرفوض ويمكنكِ التواصل مع care@motd.ae إذا احتجتِ توضيحاً.",
  },
  {
    id: "dr-27",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-returns",
    questionEn: "Can I get alterations if my custom fit needs a small adjustment?",
    questionAr: "هل يمكنني الحصول على تعديلات إذا احتاج مقاسي المخصص ضبطاً بسيطاً؟",
    answerEn:
      "Because custom garments are made to your measurements, they aren't sold on a standard return basis. If minor adjustments are needed, contact Care soon after delivery.\n\nOur returns guidance notes that alteration requests may be coordinated with the tailoring house within a short period after delivery.",
    answerAr:
      "لأن الملابس المخصصة تُفصَّل حسب قياساتك، فهي لا تُباع على أساس إرجاع قياسي. إذا لزم ضبط بسيط، تواصلي مع الرعاية بعد التسليم بوقت قصير.\n\nتشير إرشادات الإرجاع لدينا إلى أن طلبات التعديل قد تُنسَّق مع دار الخياطة خلال فترة قصيرة بعد التسليم.",
  },
  {
    id: "dr-28",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-fabrics",
    questionEn: "Is leftover fabric shipped back separately?",
    questionAr: "هل يُشحن القماش المتبقي بشكل منفصل؟",
    answerEn:
      "No. Leftover fabric from a custom order is returned with your finished Mukhawar in the outbound delivery.\n\nYou'll see the leftover meters noted on your order so you know what to expect in the package.",
    answerAr:
      "لا. يُعاد القماش المتبقي من الطلب المخصص مع مخوارك النهائي في التوصيل الصادر.\n\nسترين الأمتار المتبقية مذكورة على طلبك حتى تعرفي ما تتوقعينه في الطرد.",
  },
  {
    id: "dr-29",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-fabrics",
    questionEn: "How does fabric collection work when I provide my own fabric?",
    questionAr: "كيف يعمل استلام القماش عندما أوفّر قماشي الخاص؟",
    answerEn:
      "After you place a Provide My Own Fabric order, MOTD schedules courier collection using the pickup address associated with your order and delivers the fabric to your selected tailor.\n\nPlease keep the fabric ready and ensure someone can hand it to the courier when they arrive.",
    answerAr:
      "بعد تقديم طلب توفير قماشي الخاص، تجدول MOTD استلام شركة التوصيل باستخدام عنوان الاستلام المرتبط بطلبك وتوصل القماش إلى الخياط المختار.\n\nيرجى إبقاء القماش جاهزاً والتأكد من وجود من يمكنه تسليمه لشركة التوصيل عند وصولها.",
  },
  {
    id: "dr-30",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-delivery",
    questionEn: "Are shipments insured or securely packaged?",
    questionAr: "هل الشحنات مؤمّنة أو مغلّفة بأمان؟",
    answerEn:
      "MOTD fulfils orders through managed courier logistics with secure packaging practices for customer deliveries.\n\nIf a package arrives damaged, contact Care within 48 hours with photos of the packaging and item so we can investigate.",
    answerAr:
      "تنفّذ MOTD الطلبات عبر لوجستيات شركات توصيل مُدارة مع ممارسات تغليف آمنة لتوصيلات العملاء.\n\nإذا وصل طرد تالفاً، تواصلي مع الرعاية خلال 48 ساعة مع صور للتغليف والقطعة حتى نتمكن من التحقيق.",
  },
  {
    id: "dr-31",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-rto",
    questionEn:
      "How long do Ready to Order deliveries usually take compared with custom?",
    questionAr: "كم تستغرق توصيلات الجاهز للطلب عادةً مقارنة بالمخصص؟",
    answerEn:
      "Ready to Order and other retail items ship after confirmation and typically move through shipped → delivered without a full tailoring cycle.\n\nCustom Mukhawars add the tailor's crafting time (shown on the design) before dispatch, so overall delivery is longer than retail-only orders.",
    answerAr:
      "تُشحن عناصر الجاهز للطلب وبقية التجزئة بعد التأكيد وتنتقل عادة عبر تم الشحن ← مُسلَّم دون دورة خياطة كاملة.\n\nتضيف المخوارات المخصصة مدة تفصيل الخياط (الظاهرة على التصميم) قبل الإرسال، لذا يكون التوصيل الإجمالي أطول من طلبات التجزئة فقط.",
  },
  {
    id: "dr-32",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-rto",
    questionEn: "What if a Ready to Order item sells out before I check out?",
    questionAr: "ماذا لو نفد عنصر جاهز للطلب قبل إتمام الدفع؟",
    answerEn:
      "Stock is validated when you add items and again when placing the order. If an item sells out, checkout will block that line and you'll need to remove it or choose another piece.\n\nWishlist items can help you revisit alternatives quickly.",
    answerAr:
      "يُتحقَّق من المخزون عند إضافة العناصر ومرة أخرى عند تقديم الطلب. إذا نفد عنصر، سيحجب الدفع ذلك البند وستحتاجين إلى إزالته أو اختيار قطعة أخرى.\n\nيمكن لعناصر قائمة الرغبات مساعدتك على مراجعة البدائل بسرعة.",
  },
  {
    id: "dr-33",
    chatbotOnly: true,
    sectionId: "section-5",
    chatTopicId: "chat-addons",
    questionEn: "Can add-ons be delivered separately from my Mukhawar?",
    questionAr: "هل يمكن توصيل الإضافات بشكل منفصل عن مخواري؟",
    answerEn:
      "Yes. Depending on fulfilment, add-ons may travel on their own delivery leg to you or be coordinated with other parcels in the order plan.\n\nYour order timeline and shipment list show each parcel's progress so you can follow every part of the delivery.",
    answerAr:
      "نعم. حسب التنفيذ، قد تسلك الإضافات مرحلة توصيل خاصة بها إليك أو تُنسَّق مع طرود أخرى في خطة الطلب.\n\nتعرض خطّة زمنية لطلبك وقائمة الشحنات تقدّم كل طرد حتى تتمكني من متابعة كل جزء من التوصيل.",
  },
  {
    id: "pa-19",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Is VAT added to my order?",
    questionAr: "هل تُضاف ضريبة القيمة المضافة إلى طلبي؟",
    answerEn:
      "Yes. MOTD applies VAT using the platform VAT rate (default 5% unless updated in settings). Cart and checkout show VAT as a separate line before payment.\n\nYour order confirmation and order details also include the VAT amount charged.",
    answerAr:
      "نعم. تطبق MOTD ضريبة القيمة المضافة باستخدام معدل الضريبة في المنصة (الافتراضي 5% ما لم يُحدَّث في الإعدادات). تعرض السلة والدفع الضريبة كبند منفصل قبل الدفع.\n\nيتضمن تأكيد طلبك وتفاصيل الطلب أيضاً مبلغ ضريبة القيمة المضافة المحتسب.",
  },
  {
    id: "pa-20",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "How does Apple Pay work on MOTD?",
    questionAr: "كيف يعمل Apple Pay على MOTD؟",
    answerEn:
      "At checkout you can choose Apple Pay or card. Apple Pay is processed through our secure Stripe payment flow on supported devices and browsers.\n\nIf Apple Pay isn't available on your device, use Visa or Mastercard card payment instead.",
    answerAr:
      "عند الدفع يمكنكِ اختيار Apple Pay أو البطاقة. يُعالَج Apple Pay عبر مسار دفع Stripe الآمن لدينا على الأجهزة والمتصفحات المدعومة.\n\nإذا لم يكن Apple Pay متاحاً على جهازك، استخدمي دفع بطاقة Visa أو Mastercard بدلاً منه.",
  },
  {
    id: "pa-21",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "Why can't I pay with methods other than card or Apple Pay?",
    questionAr: "لماذا لا يمكنني الدفع بطرق غير البطاقة أو Apple Pay؟",
    answerEn:
      "Custom and retail checkouts currently accept card and Apple Pay only. Cash on Delivery isn't offered so production and fulfilment can begin as soon as payment confirms.\n\nAny additional methods would appear at checkout if enabled in the future.",
    answerAr:
      "تقبل عمليات الدفع للطلبات المخصصة والتجزئة حالياً البطاقة وApple Pay فقط. الدفع عند الاستلام غير متاح حتى يبدأ الإنتاج والتنفيذ فور تأكيد الدفع.\n\nستظهر أي طرق إضافية عند الدفع إذا فُعّلت مستقبلاً.",
  },
  {
    id: "pa-22",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-account",
    questionEn: "Do I need to verify my email address?",
    questionAr: "هل أحتاج إلى التحقق من عنوان بريدي الإلكتروني؟",
    answerEn:
      "Yes for account security and certain checkout flows. Registered users may need to verify email with a one-time code, and guest checkout verifies the contact email via OTP before payment can complete.\n\nThis helps us send confirmations and protect your orders.",
    answerAr:
      "نعم لأمان الحساب وبعض مسارات الدفع. قد يحتاج المستخدمون المسجّلون إلى التحقق من البريد برمز لمرة واحدة، ويتحقق الدفع كزائر من بريد الاتصال عبر رمز OTP قبل إكمال الدفع.\n\nهذا يساعدنا على إرسال التأكيدات وحماية طلباتك.",
  },
  {
    id: "pa-23",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-account",
    questionEn: "How does guest checkout email verification work?",
    questionAr: "كيف يعمل التحقق من البريد الإلكتروني للدفع كزائر؟",
    answerEn:
      "During guest checkout you'll enter a contact email and confirm it with a one-time passcode sent to that address.\n\nOnce verified, you can complete payment. Creating a full account later still unlocks measurements, family profiles, and the complete wardrobe.",
    answerAr:
      "أثناء الدفع كزائر ستدخلين بريداً إلكترونياً للاتصال وتؤكدينه برمز مرور لمرة واحدة يُرسل إلى ذلك العنوان.\n\nبمجرد التحقق، يمكنكِ إكمال الدفع. إنشاء حساب كامل لاحقاً يفتح مع ذلك القياسات وملفات العائلة والخزانة الكاملة.",
  },
  {
    id: "pa-24",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-account",
    questionEn: "How do I change the email on my account?",
    questionAr: "كيف أغيّر البريد الإلكتروني في حسابي؟",
    answerEn:
      "Open Account Settings and use the change-email flow. You'll confirm the new address with an email OTP before it's applied.\n\nKeep access to your inbox so you don't miss order and security messages.",
    answerAr:
      "افتحي إعدادات الحساب واستخدمي مسار تغيير البريد الإلكتروني. ستؤكدين العنوان الجديد برمز OTP بالبريد قبل تطبيقه.\n\nحافظي على الوصول إلى صندوق واردك حتى لا يفوتك رسائل الطلبات والأمان.",
  },
  {
    id: "pa-25",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-wardrobe",
    questionEn: "What is the difference between Favourites and Wishlist?",
    questionAr: "ما الفرق بين المفضلات وقائمة الرغبات؟",
    answerEn:
      "Tapping the heart on designs, fabrics, or Ready to Order pieces saves them to your wishlist/favourites so you can revisit them later.\n\nIn your account, Favourites brings those saved items together as part of My Wardrobe, alongside orders and measurements.",
    answerAr:
      "النقر على القلب على التصاميم أو الأقمشة أو القطع الجاهزة للطلب يحفظها في قائمة الرغبات/المفضلات حتى تتمكني من العودة إليها لاحقاً.\n\nفي حسابك، تجمع المفضلات تلك العناصر المحفوظة كجزء من خزانة ملابسي، إلى جانب الطلبات والقياسات.",
  },
  {
    id: "pa-26",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-orders",
    questionEn: "Where do I manage notifications?",
    questionAr: "أين أدير الإشعارات؟",
    answerEn:
      "Signed-in customers can open the Notifications tab in My Account to read order updates and related alerts.\n\nUnread counts appear on the account navigation so you don't miss important status changes.",
    answerAr:
      "يمكن للعملاء المسجّلين فتح تبويب الإشعارات في حسابي لقراءة تحديثات الطلب والتنبيهات ذات الصلة.\n\nتظهر أعداد غير المقروء في تنقل الحساب حتى لا تفوتك تغيّرات الحالة المهمة.",
  },
  {
    id: "pa-27",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-support",
    questionEn: "Where can I see reviews I've written?",
    questionAr: "أين يمكنني رؤية التقييمات التي كتبتها؟",
    answerEn:
      "Open My Reviews in your account to view reviews linked to your purchases and submit new ones for eligible delivered items.\n\nThis keeps your feedback in one place alongside your order history.",
    answerAr:
      "افتحي تقييماتي في حسابك لعرض التقييمات المرتبطة بمشترياتك وتقديم تقييمات جديدة للعناصر المُسلَّمة المؤهلة.\n\nهذا يبقي ملاحظاتك في مكان واحد إلى جانب سجل طلباتك.",
  },
  {
    id: "pa-28",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-browse",
    questionEn: "How do I change language between English and Arabic?",
    questionAr: "كيف أغيّر اللغة بين الإنجليزية والعربية؟",
    answerEn:
      "Use the language control in the header (Locale / language toggle) to switch between English and العربية.\n\nYour path stays on the same page in the other locale whenever that page supports both languages.",
    answerAr:
      "استخدمي عنصر التحكم باللغة في الترويسة (تبديل اللغة / Locale) للتبديل بين English والعربية.\n\nيبقى مسارك على الصفحة نفسها باللغة الأخرى كلما كانت تلك الصفحة تدعم اللغتين.",
  },
  {
    id: "pa-29",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-browse",
    questionEn: "Can I change my cookie preferences later?",
    questionAr: "هل يمكنني تغيير تفضيلات ملفات تعريف الارتباط لاحقاً؟",
    answerEn:
      "Yes. After you first choose accept or reject on the cookie banner, you can reopen cookie preferences from the site (cookie preference control) and update your choice.\n\nEssential shopping features continue to work even if you reject analytics cookies.",
    answerAr:
      "نعم. بعد اختيارك الأول للقبول أو الرفض في بانر الكوكيز، يمكنكِ إعادة فتح تفضيلات ملفات تعريف الارتباط من الموقع (عنصر تفضيل الكوكيز) وتحديث اختيارك.\n\nتستمر ميزات التسوق الأساسية في العمل حتى إذا رفضتِ ملفات تعريف الارتباط التحليلية.",
  },
  {
    id: "pa-30",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-wardrobe",
    questionEn: "Does my cart sync when I log in on another device?",
    questionAr: "هل تُزامن سلتي عندما أسجّل الدخول على جهاز آخر؟",
    answerEn:
      "When you're signed in, MOTD can sync your server cart so items follow your account across devices.\n\nOn login, local and account carts are merged carefully so you don't lose items you already added.",
    answerAr:
      "عندما تكونين مسجّلة الدخول، يمكن لـ MOTD مزامنة سلة الخادم حتى تتبع العناصر حسابك عبر الأجهزة.\n\nعند تسجيل الدخول، تُدمج سلة الجهاز المحلية وسلة الحساب بعناية حتى لا تفقدي العناصر التي أضفتها بالفعل.",
  },
  {
    id: "pa-31",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-pricing",
    questionEn: "What payment details does MOTD store?",
    questionAr: "ما تفاصيل الدفع التي تخزّنها MOTD؟",
    answerEn:
      "Payments are processed by Stripe. MOTD does not store your full card number.\n\nIf you choose to save a payment method for faster checkout, that information is stored securely by the payment provider—not on MOTD's own servers.",
    answerAr:
      "تُعالَج المدفوعات عبر Stripe. لا تخزّن MOTD رقم بطاقتك الكامل.\n\nإذا اخترتِ حفظ طريقة دفع لدفع أسرع، تُخزَّن تلك المعلومات بأمان لدى مزوّد الدفع—وليس على خوادم MOTD الخاصة.",
  },
  {
    id: "pa-32",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-delivery",
    questionEn: "Why do I see UAE phone validation at checkout?",
    questionAr: "لماذا أرى التحقق من رقم الهاتف الإماراتي عند الدفع؟",
    answerEn:
      "Delivery and contact phone numbers are validated in UAE format so couriers and Care can reach you.\n\nEnter a valid UAE mobile number on your delivery address to avoid checkout errors.",
    answerAr:
      "تُتحقَّق أرقام هاتف التوصيل والاتصال بصيغة إماراتية حتى تتمكن شركات التوصيل والرعاية من الوصول إليك.\n\nأدخلي رقم جوال إماراتي صالحاً في عنوان التوصيل لتجنّب أخطاء الدفع.",
  },
  {
    id: "pa-33",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-account",
    questionEn: "What's included under Account Settings?",
    questionAr: "ماذا يتضمن قسم إعدادات الحساب؟",
    answerEn:
      "Settings let you manage personal details such as contact information and email change verification, aligned with your MOTD profile.\n\nCombined with Profile, Orders, Favourites, Measurements, and Family Members, this is your full customer wardrobe control centre.",
    answerAr:
      "تتيح لك الإعدادات إدارة التفاصيل الشخصية مثل معلومات الاتصال والتحقق من تغيير البريد الإلكتروني، بما يتوافق مع ملف MOTD الخاص بك.\n\nمع الملف الشخصي والطلبات والمفضلات والقياسات وأفراد العائلة، هذا هو مركز التحكم الكامل لخزانة العميل لديك.",
  },
  {
    id: "pa-34",
    chatbotOnly: true,
    sectionId: "section-6",
    chatTopicId: "chat-account",
    questionEn: "What should I do if I didn't receive my email OTP?",
    questionAr: "ماذا أفعل إذا لم أستلم رمز OTP عبر البريد الإلكتروني؟",
    answerEn:
      "Check spam/junk folders and confirm you typed the email correctly, then request a new code from the verification screen.\n\nIf codes still don't arrive, contact care@motd.ae or WhatsApp @MOTDae during Care hours and we'll help you regain access.",
    answerAr:
      "تحققي من مجلدات البريد غير المرغوب فيه / المهملات وتأكدي من كتابة البريد بشكل صحيح، ثم اطلبي رمزاً جديداً من شاشة التحقق.\n\nإذا لم تصل الرموز بعد، تواصلي مع care@motd.ae أو واتساب @MOTDae خلال ساعات الرعاية وسنساعدك على استعادة الوصول.",
  },
];

/** Original guide FAQs only (excludes chatbot-only items). */
export const GUIDE_FAQ_ITEMS = FAQ_ITEMS.filter((item) => !item.chatbotOnly);

export const FAQ_SECTIONS = [
  { id: "section-1", titleEn: "Getting Started", titleAr: "دليل البداية" },
  {
    id: "section-2",
    titleEn: "Creating Your Mukhawar",
    titleAr: "تفصيل المخوار",
  },
  {
    id: "section-3",
    titleEn: "Tailors & Measurements",
    titleAr: "الخياطون والقياسات",
  },
  {
    id: "section-4",
    titleEn: "Orders & Your Creation Journey",
    titleAr: "مسار طلبك وتفصيله",
  },
  {
    id: "section-5",
    titleEn: "Delivery & Returns",
    titleAr: "التوصيل والإرجاع",
  },
  {
    id: "section-6",
    titleEn: "Payments & Your MOTD Account",
    titleAr: "الحساب والمدفوعات",
  },
] as const;

/** Chatbot-only topic list (Guide keeps FAQ_SECTIONS / section-1..6). */
export const CHATBOT_FAQ_SECTIONS = [
  { id: "chat-track", titleEn: "Track Your Order", titleAr: "تتبع طلبك" },
  { id: "chat-about", titleEn: "About MOTD & Mukhawar", titleAr: "عن MOTD والمخوار" },
  { id: "chat-browse", titleEn: "Language, Currency & Browsing", titleAr: "اللغة والعملة والتصفح" },
  { id: "chat-account", titleEn: "Account & Sign-In", titleAr: "الحساب وتسجيل الدخول" },
  { id: "chat-designs", titleEn: "Designs & Custom Options", titleAr: "التصاميم وخيارات التفصيل" },
  { id: "chat-fabrics", titleEn: "Fabrics, Cuts & Leftover", titleAr: "الأقمشة والقصات والمتبقي" },
  { id: "chat-rto", titleEn: "Ready to Order", titleAr: "جاهز للطلب" },
  { id: "chat-addons", titleEn: "Add-ons & Accessories", titleAr: "الإضافات والإكسسوارات" },
  { id: "chat-brands", titleEn: "Brands & Partners", titleAr: "العلامات والشركاء" },
  { id: "chat-tailors", titleEn: "Tailors & Craftsmanship", titleAr: "الخياطون والحرفية" },
  { id: "chat-measurements", titleEn: "Measurements & Family Profiles", titleAr: "القياسات وملفات العائلة" },
  { id: "chat-pricing", titleEn: "Pricing, VAT & Payments", titleAr: "الأسعار والضريبة والمدفوعات" },
  { id: "chat-wardrobe", titleEn: "Wishlist, Cart & Wardrobe", titleAr: "قائمة الرغبات والسلة والخزانة" },
  { id: "chat-orders", titleEn: "Orders & Tracking", titleAr: "الطلبات والتتبع" },
  { id: "chat-delivery", titleEn: "Delivery & Shipping", titleAr: "التوصيل والشحن" },
  { id: "chat-returns", titleEn: "Returns & Alterations", titleAr: "الإرجاع والتعديلات" },
  { id: "chat-support", titleEn: "Care, Reviews & Privacy", titleAr: "الرعاية والتقييمات والخصوصية" },
] as const;

/** Special chatbot topic: opens Order ID lookup (not FAQ questions). */
export const CHATBOT_TRACK_TOPIC_ID = "chat-track";

