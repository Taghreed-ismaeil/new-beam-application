// The app's legal texts (Terms, Privacy, Gifts & Rewards, Content, Changes & Refunds),
// Arabic and English. Shown on app/policies/[doc].jsx and accepted at sign-up.
// Body lines: "- " = bullet, "  " = sub-bullet, "[[...]]" = still to be filled in.
// Bump POLICY_VERSION whenever the texts change in a way users must accept again.
export const POLICY_VERSION = "2026-10-27";

export const POLICY_IDS = ["terms", "privacy", "gifts", "content", "refunds"];

export const POLICIES = {
  terms: {
    ar: {
      title: "الشروط والأحكام",
      updated: "آخر تحديث: 27 تشرين الأول 2026",
      sections: [
        {
          h: "1. التعريف والقبول",
          body: [
            "تنظّم هذه الشروط استخدامك لتطبيق «بيم» (Beam – Shawerma & More) وجميع الخدمات المقدّمة من خلاله، بما فيها الطلب والتوصيل والاستلام والحجز وبرنامج الهدايا ومنشورات الميديا.",
            "يشغّل التطبيقَ مطعمُ بيم، وتتولّى شركة Virelix Solutions تطويره وتشغيله تقنياً.",
            "بإنشاء حساب أو استخدام التطبيق، فإنك تقرّ بأنك قرأت هذه الشروط وسياسة الخصوصية وشروط برنامج الهدايا وسياسة المحتوى وسياسة التعديل والإلغاء والاسترجاع، وتوافق عليها. ولا يمكن إنشاء حساب دون هذه الموافقة.",
          ],
        },
        {
          h: "2. التعريفات",
          body: [
            "- التطبيق: تطبيق «بيم» على الهواتف الذكية وأي نسخة إلكترونية منه.",
            "- المطعم / نحن: مطعم بيم والجهة المشغّلة له.",
            "- المستخدم / أنت: كل شخص يستخدم التطبيق.",
            "- الطلب: كل طلب شراء منتجات يُرسل عبر التطبيق.",
            "- القسيمة: رمز يحصل عليه المستخدم من برنامج الهدايا ويُستبدل لدى المطعم.",
          ],
        },
        {
          h: "3. الأهلية",
          body: [
            "يجب أن يكون عمرك 14 سنة فأكثر لإنشاء حساب واستخدام التطبيق. ولا يُسمح لمن هم دون 14 سنة بإنشاء حساب.",
            "تتعهّد بأن المعلومات التي تقدّمها صحيحة وتخصّك.",
          ],
        },
        {
          h: "4. الحساب",
          body: [
            "- يُنشأ الحساب برقم هاتفك واسمك وكلمة سر، ويتم التحقق من الرقم برمز يُرسل إليك عبر واتساب.",
            "- لكل رقم هاتف حساب واحد فقط.",
            "- أنت مسؤول عن الحفاظ على سرّية كلمة السر وعن كل ما يتم من خلال حسابك، وعليك إبلاغنا فوراً إن شككت في استخدام غير مصرّح به.",
            "- يحقّ لنا تعليق الحساب أو حظره عند مخالفة هذه الشروط، أو الاشتباه بالاحتيال، أو إساءة استخدام العروض أو الهدايا، أو الإساءة لفريق المطعم أو للمستخدمين.",
            "- يمكنك حذف حسابك في أي وقت من صفحة «حسابي». ويُحذف عند ذلك اسمك ونقاطك وقسائمك غير المستخدمة وسجلّ المسح، وتبقى سجلات الطلبات السابقة محفوظة دون ما يدلّ على هويتك لأغراض المحاسبة. ويمكنك إنشاء حساب جديد بالرقم نفسه لاحقاً.",
            "- إذا لم تستخدم التطبيق ولم تمسح أي رمز QR من رموز المطعم لمدة 6 أشهر متتالية، يحقّ للمطعم تصفية بيانات حسابك وإلغاء جميع جوائزك وقسائمك غير المستخدمة، كما هو موضّح في سياسة الخصوصية وشروط برنامج الهدايا.",
          ],
        },
        {
          h: "5. الطلبات",
          body: [
            "- يمكنك الطلب للتوصيل، أو للاستلام من المطعم، أو للتناول داخل المطعم على طاولة.",
            "- لا يُعدّ الطلب مقبولاً إلا بعد ظهور تأكيده في التطبيق. ويصلك ملخّص الطلب على واتساب.",
            "- يحقّ للمطعم رفض الطلب أو إلغاؤه إذا لم يتوفر منتج، أو تعذّر التوصيل إلى العنوان، أو ظهر خطأ واضح في السعر، أو لم يتم الدفع، أو وُجد اشتباه بالاحتيال، أو لأسباب تشغيلية خارجة عن الإرادة. وفي هذه الحالة يُعاد أي مبلغ مدفوع وفق سياسة الاسترجاع.",
            "- ملاحظات الطلب (مثل «بدون بصل») تُنفّذ قدر الإمكان ولا تُعدّ ضماناً.",
            "- تعديل الطلب بعد تأكيده والإضافة عليه وإلغاؤه يخضع لـ«سياسة التعديل والإلغاء والاسترجاع».",
          ],
        },
        {
          h: "6. الأسعار",
          body: [
            "- الأسعار المعروضة بالدينار الأردني وتشمل الضريبة ما لم يُذكر خلاف ذلك.",
            "- قد تتغيّر الأسعار والمنتجات وتوفّرها دون إشعار مسبق، ويُعتمد السعر الظاهر لحظة تأكيد الطلب.",
            "- قد تُضاف رسوم توصيل تظهر لك قبل تأكيد الطلب.",
          ],
        },
        {
          h: "7. المنتجات والحساسية الغذائية",
          body: [
            "- نبذل جهدنا لتكون الصور والأوصاف دقيقة، وقد يختلف شكل المنتج الفعلي قليلاً عن الصورة.",
            "- إذا كانت لديك حساسية من أي مكوّن، فاكتبها في ملاحظات الطلب وتواصل مع المطعم للتأكد قبل الطلب. لا يمكننا ضمان خلوّ أي منتج تماماً من آثار مكوّنات أخرى بسبب طبيعة المطبخ.",
          ],
        },
        {
          h: "8. الدفع",
          body: [
            "- طرق الدفع المتاحة: نقداً عند الاستلام أو التوصيل، أو بتحويل «كليك» (CliQ)، أو أي طريقة أخرى تظهر في التطبيق.",
            "- عند الدفع بكليك، ترفع صورة إثبات التحويل في التطبيق، ولا يُعدّ الدفع مكتملاً إلا بعد أن يتحقق منه فريق المطعم.",
            "- لا تُرسل أبداً بيانات بطاقتك البنكية أو رموزها في الملاحظات أو المحادثات.",
          ],
        },
        {
          h: "9. التوصيل والاستلام",
          body: [
            "- عليك إدخال عنوان دقيق وتحديد موقعك على الخريطة ورقم هاتف يمكن الوصول إليه.",
            "- أوقات التوصيل تقديرية وقد تتأثر بالازدحام والطقس وحجم الطلبات.",
            "- إذا تعذّر التسليم بسبب عنوان خاطئ أو عدم الرد، يحقّ للمطعم احتساب قيمة الطلب.",
            "- في طلبات الاستلام، تُستلم الطلبات من المطعم خلال وقت معقول من إشعار الجاهزية.",
          ],
        },
        {
          h: "10. الحجوزات",
          body: [
            "- حجز الطاولات يخضع لتأكيد المطعم.",
            "- يُرجى الالتزام بالموعد، وقد يُلغى الحجز عند التأخر أكثر من [[15]] دقيقة دون إبلاغ.",
            "- يمكنك إلغاء الحجز من التطبيق أو بالتواصل مع المطعم.",
          ],
        },
        {
          h: "11. رسائل واتساب",
          body: [
            "- نرسل إليك عبر واتساب رمز التحقق عند التسجيل أو استعادة كلمة السر، وملخّص كل طلب ورابطاً لتعديله.",
            "- رسائل العروض والتسويق لا تُرسل إلا بموافقتك المنفصلة، ويمكنك إلغاؤها في أي وقت.",
            "- لا تشارك رمز التحقق أو رابط تعديل الطلب مع أي شخص.",
          ],
        },
        {
          h: "12. برنامج الهدايا ومنشورات الميديا",
          body: [
            "يخضع برنامج الهدايا (جمع القطع، العجلة، جائزة الشهر، القسائم) لـ«شروط برنامج الهدايا والجوائز». وتخضع المنشورات والتعليقات والتقييمات لـ«سياسة المحتوى». وكلاهما جزء لا يتجزأ من هذه الشروط.",
          ],
        },
        {
          h: "13. الاستخدام الممنوع",
          body: [
            "يُمنع عليك:",
            "- محاولة اختراق التطبيق أو الأنظمة أو استغلال ثغراتها.",
            "- الدخول إلى حساب غيرك أو بياناته.",
            "- إرسال طلبات وهمية أو التلاعب بالأسعار أو النقاط أو القسائم.",
            "- استخدام برامج آلية أو كثرة الطلبات بهدف تعطيل الخدمة.",
            "- انتحال شخصية أي شخص أو جهة.",
            "- استخدام طرق دفع لا يحقّ لك استخدامها.",
          ],
        },
        {
          h: "14. الملكية الفكرية",
          body: [
            "اسم «بيم» وشعاره وتصميم التطبيق وصوره ومحتواه وبرمجياته مملوكة للمطعم أو لـ Virelix Solutions أو لأصحاب الحقوق، ولا يجوز نسخها أو استخدامها دون إذن كتابي.",
          ],
        },
        {
          h: "15. توفّر الخدمة",
          body: [
            "نسعى لأن يعمل التطبيق دون انقطاع، لكننا لا نضمن ذلك. فقد يتوقف مؤقتاً للصيانة أو التحديث أو بسبب أعطال الإنترنت أو مزوّدي الخدمة أو ظروف خارجة عن إرادتنا.",
          ],
        },
        {
          h: "16. حدود المسؤولية والإعفاء منها",
          body: [
            "بموافقتك على هذه الشروط وسياسة الخصوصية وباقي السياسات، فإنك تقرّ بأنك قرأتها كاملة وفهمتها، ووافقت عليها بإرادتك الحرة ورضاك ودون أي إكراه.",
            "وعليه، وإلى أقصى حدّ يسمح به القانون الأردني، يُعفى المطعم والجهة المشغّلة للتطبيق (Virelix Solutions) وموظفوهما إعفاءً كاملاً من أي مسؤولية قانونية، مدنية أو جزائية، بما في ذلك أي ادعاء بموجب قانون الجرائم الإلكترونية، عن:",
            "- استخدامك للتطبيق، وكل ما تنشره أو تكتبه أو ترفعه فيه، فأنت وحدك المسؤول عنه.",
            "- أفعال المستخدمين الآخرين ومحتواهم.",
            "- استخدام المحتوى الذي تنشره وفق ما أذنت به في «سياسة المحتوى».",
            "- الأضرار غير المباشرة، أو الناتجة عن انقطاع الخدمة أو أعطال الإنترنت أو الأجهزة أو مزوّدي الخدمة أو أي ظروف خارجة عن إرادتنا.",
            "- إساءة استخدام حسابك بسبب إفشائك كلمة السر أو إهمالك حماية جهازك.",
            "وتتعهّد بتعويض المطعم والجهة المشغّلة عن أي ضرر أو مطالبة تنشأ عن مخالفتك لهذه الشروط أو عن محتوى نشرته.",
            "ولا يشمل هذا الإعفاء ما لا يجيز القانون الأردني الإعفاء منه.",
          ],
        },
        {
          h: "17. الشكاوى",
          body: [
            "يمكنك إرسال تقييم أو شكوى من صفحة «حسابي» في التطبيق، أو التواصل معنا على contact@vrelix.net. نرجو إرفاق رقم الطلب وتفاصيل كافية.",
          ],
        },
        {
          h: "18. تعديل الشروط",
          body: [
            "قد نعدّل هذه الشروط عند تغيّر الخدمات أو المتطلبات القانونية. وعند أي تعديل جوهري، ستظهر لك الشروط الجديدة في التطبيق ويلزم قبولها لمتابعة الاستخدام.",
          ],
        },
        {
          h: "19. القانون الواجب التطبيق",
          body: [
            "تخضع هذه الشروط لقوانين المملكة الأردنية الهاشمية، وتختص المحاكم الأردنية المختصة في عمّان بالنظر في أي نزاع ينشأ عنها.",
          ],
        },
        {
          h: "20. التواصل",
          body: [
            "مطعم بيم (Beam – Shawerma & More) – عمّان، المملكة الأردنية الهاشمية",
            "المشغّل التقني للتطبيق: Virelix Solutions",
            "البريد الإلكتروني: contact@vrelix.net",
            "الهاتف: 0787844005",
            "الاسم القانوني للجهة المشغّلة: [[يُستكمل قبل النشر]]",
            "العنوان المسجّل: [[يُستكمل قبل النشر]]",
          ],
        },
      ],
    },
    en: {
      title: "Terms and Conditions",
      updated: "Last updated: 27 October 2026",
      sections: [
        {
          h: "1. About these terms",
          body: [
            "These Terms govern your use of the Beam app (Beam – Shawerma & More) and all services offered through it, including ordering, delivery, pickup, table reservations, the gifts program and media posts.",
            "The app is operated by Beam Restaurant and developed and run technically by Virelix Solutions.",
            "By creating an account or using the app, you confirm that you have read and agree to these Terms, the Privacy Policy, the Gifts & Rewards Terms, the Content Policy and the Order Changes, Cancellation & Refund Policy. An account cannot be created without this agreement.",
          ],
        },
        {
          h: "2. Definitions",
          body: [
            "- App: the Beam mobile app and any web version of it.",
            "- Restaurant / we / us: Beam Restaurant and the entity that operates it.",
            "- User / you: anyone who uses the app.",
            "- Order: any request to buy products sent through the app.",
            "- Voucher: a code earned through the gifts program and redeemed at the restaurant.",
          ],
        },
        {
          h: "3. Eligibility",
          body: [
            "You must be 14 or older to create an account and use the app. Anyone under 14 may not create an account.",
            "You confirm that the information you provide is accurate and belongs to you.",
          ],
        },
        {
          h: "4. Your account",
          body: [
            "- You sign up with your phone number, name and a password. Your number is verified with a code sent to you on WhatsApp.",
            "- Each phone number can have only one account.",
            "- You are responsible for keeping your password secret and for all activity on your account. Tell us immediately if you suspect unauthorised use.",
            "- We may suspend or block an account that breaks these Terms, is suspected of fraud, abuses offers or gifts, or abuses restaurant staff or other users.",
            "- You can delete your account at any time from the Account page. Your name, points, unused vouchers and scan history are then deleted. Past order records are kept without anything that identifies you, for accounting purposes. You can later sign up again with the same number.",
            "- If you do not use the app or scan any of the restaurant's QR codes for 6 months in a row, the restaurant may clear your account data and cancel all your unused prizes and vouchers, as set out in the Privacy Policy and the Gifts & Rewards Terms.",
          ],
        },
        {
          h: "5. Orders",
          body: [
            "- You can order for delivery, for pickup, or to eat in at a table.",
            "- An order is accepted only once its confirmation appears in the app. A summary of the order is also sent to you on WhatsApp.",
            "- The restaurant may refuse or cancel an order if an item is unavailable, the address cannot be served, there is an obvious pricing error, payment is not completed, fraud is suspected, or for operational reasons beyond its control. Any amount paid is then refunded under the Refund Policy.",
            '- Order notes (such as "no onions") are followed where possible but are not guaranteed.',
            "- Changing, adding to and cancelling an order after it is confirmed is covered by the Order Changes, Cancellation & Refund Policy.",
          ],
        },
        {
          h: "6. Prices",
          body: [
            "- Prices are shown in Jordanian Dinars and include tax unless stated otherwise.",
            "- Prices, products and availability may change without notice. The price shown when you confirm your order applies.",
            "- A delivery fee may apply and is shown before you confirm.",
          ],
        },
        {
          h: "7. Products and allergies",
          body: [
            "- We try to keep photos and descriptions accurate. The actual dish may look slightly different.",
            "- If you have a food allergy, write it in the order notes and contact the restaurant to confirm before ordering. Because of the nature of the kitchen, we cannot guarantee that any item is completely free of traces of other ingredients.",
          ],
        },
        {
          h: "8. Payment",
          body: [
            "- Available payment methods: cash on pickup or delivery, CliQ bank transfer, or any other method shown in the app.",
            "- When paying by CliQ, you upload a photo of the transfer receipt in the app. Payment is complete only once restaurant staff have verified it.",
            "- Never send your bank card details or codes in order notes or messages.",
          ],
        },
        {
          h: "9. Delivery and pickup",
          body: [
            "- You must enter an accurate address, pin your location on the map, and give a phone number you can be reached on.",
            "- Delivery times are estimates and may be affected by traffic, weather and order volume.",
            "- If an order cannot be delivered because the address is wrong or you do not answer, the restaurant may charge for the order.",
            "- Pickup orders should be collected within a reasonable time after you are told they are ready.",
          ],
        },
        {
          h: "10. Reservations",
          body: [
            "- Table reservations are subject to confirmation by the restaurant.",
            "- Please arrive on time. A reservation may be cancelled if you are more than [[15]] minutes late without letting us know.",
            "- You can cancel a reservation in the app or by contacting the restaurant.",
          ],
        },
        {
          h: "11. WhatsApp messages",
          body: [
            "- We send you, on WhatsApp, a verification code when you sign up or reset your password, and a summary of each order with a link to change it.",
            "- Offers and marketing messages are sent only with your separate consent, which you can withdraw at any time.",
            "- Do not share your verification code or your order-change link with anyone.",
          ],
        },
        {
          h: "12. Gifts program and media posts",
          body: [
            "The gifts program (collecting pieces, the wheel, the prize of the month and vouchers) is governed by the Gifts & Rewards Terms. Posts, comments and reviews are governed by the Content Policy. Both form part of these Terms.",
          ],
        },
        {
          h: "13. Prohibited use",
          body: [
            "You must not:",
            "- Try to hack the app or its systems, or exploit any weakness in them.",
            "- Access another person's account or data.",
            "- Place fake orders or manipulate prices, points or vouchers.",
            "- Use automated tools or flood the service with requests to disrupt it.",
            "- Impersonate any person or organisation.",
            "- Use a payment method you are not entitled to use.",
          ],
        },
        {
          h: "14. Intellectual property",
          body: [
            "The Beam name and logo, and the app's design, images, content and software, belong to the restaurant, Virelix Solutions or their rights holders. They may not be copied or used without written permission.",
          ],
        },
        {
          h: "15. Availability",
          body: [
            "We aim to keep the app running without interruption but cannot guarantee it. It may stop temporarily for maintenance or updates, or because of internet outages, service-provider failures or circumstances beyond our control.",
          ],
        },
        {
          h: "16. Limitation of and release from liability",
          body: [
            "By agreeing to these Terms, the Privacy Policy and the other policies, you confirm that you have read them in full, understood them, and agreed to them freely, of your own will and without any pressure.",
            "Accordingly, to the fullest extent permitted by Jordanian law, the restaurant, the app's operator (Virelix Solutions) and their staff are fully released from any legal liability, civil or criminal, including any claim under the Cybercrime Law, for:",
            "- Your use of the app and everything you post, write or upload in it, for which you alone are responsible.",
            "- The actions and content of other users.",
            "- Use of the content you post as permitted in the Content Policy.",
            "- Indirect losses, or losses caused by service interruptions, internet, device or provider failures, or any circumstances beyond our control.",
            "- Misuse of your account because you shared your password or did not protect your device.",
            "You agree to compensate the restaurant and the operator for any loss or claim arising from your breach of these Terms or from content you posted.",
            "This release does not cover anything that Jordanian law does not allow to be excluded.",
          ],
        },
        {
          h: "17. Complaints",
          body: [
            "You can send a review or complaint from the Account page in the app, or contact us at contact@vrelix.net. Please include the order number and enough detail.",
          ],
        },
        {
          h: "18. Changes to these terms",
          body: [
            "We may update these Terms when our services or legal requirements change. If we make a significant change, the new Terms will appear in the app and you will need to accept them to keep using it.",
          ],
        },
        {
          h: "19. Governing law",
          body: [
            "These Terms are governed by the laws of the Hashemite Kingdom of Jordan. The competent courts in Amman have jurisdiction over any dispute arising from them.",
          ],
        },
        {
          h: "20. Contact",
          body: [
            "Beam Restaurant (Beam – Shawerma & More) – Amman, Hashemite Kingdom of Jordan",
            "Technical operator of the app: Virelix Solutions",
            "Email: contact@vrelix.net",
            "Phone: 0787844005",
            "Legal name of the operating entity: [[to be completed before publication]]",
            "Registered address: [[to be completed before publication]]",
          ],
        },
      ],
    },
  },
  privacy: {
    ar: {
      title: "سياسة الخصوصية",
      updated: "آخر تحديث: 27 تشرين الأول 2026",
      sections: [
        {
          h: "1. مقدمة",
          body: [
            "توضّح هذه السياسة البيانات الشخصية التي نجمعها عند استخدامك لتطبيق «بيم»، ولماذا نجمعها، ومع من نشاركها، وكم نحتفظ بها، وما حقوقك. ونلتزم فيها بقانون حماية البيانات الشخصية الأردني رقم (24) لسنة 2023 والأنظمة والتعليمات الصادرة بموجبه.",
          ],
        },
        {
          h: "2. المسؤول عن البيانات",
          body: [
            "المسؤول عن بياناتك (المتحكّم) هو: [[الاسم القانوني لمطعم بيم]].",
            "وتعالج شركة Virelix Solutions البيانات نيابةً عنه بصفتها مزوّداً تقنياً، وفق تعليماته وعقد مكتوب بينهما.",
            "مسؤول حماية البيانات (إن لزم قانوناً): [[يُستكمل]]، ويمكن التواصل معه على contact@vrelix.net.",
          ],
        },
        {
          h: "3. البيانات التي نجمعها",
          body: [
            "بيانات الحساب: الاسم، ورقم الهاتف، وكلمة السر (محفوظة بشكل مشفّر لا يمكن قراءته)، ولغة التطبيق.",
            "بيانات الطلبات: المنتجات والكميات والملاحظات والأسعار، ونوع الطلب، وحالته وتاريخه، ورقم الطاولة عند الطلب داخل المطعم.",
            "بيانات التوصيل: العنوان، وموقعك على الخريطة عند تحديده، وتعليمات التوصيل.",
            "بيانات الدفع: طريقة الدفع وحالته، وصورة إثبات التحويل عند الدفع بكليك. لا نجمع بيانات البطاقات البنكية.",
            "بيانات برنامج الهدايا: سجلّ مسح رموز QR، والقطع المجمّعة، ونتائج العجلة، والقسائم واستخدامها.",
            "المحتوى الذي تنشره: الصور والمنشورات والتعليقات والإعجابات في قسم الميديا.",
            "التقييمات والشكاوى: نصّها وتقييمك والطلب المرتبط بها.",
            "الحجوزات: التاريخ والوقت وعدد الأشخاص والملاحظات.",
            "بيانات تقنية: نوع الجهاز ونظام التشغيل وإصدار التطبيق وسجلات الأخطاء والأمان.",
          ],
        },
        {
          h: "4. أذونات الجهاز",
          body: [
            "- الكاميرا: لمسح رموز QR في برنامج الهدايا، ولتصوير المنشورات أو إثبات الدفع إن اخترت ذلك.",
            "- الموقع: لتحديد عنوان التوصيل على الخريطة فقط، وعند استخدامك لهذه الميزة.",
            "- الصور: لاختيار صورة لمنشور أو لإثبات الدفع.",
            "يمكنك رفض هذه الأذونات أو إلغاؤها من إعدادات هاتفك، وقد لا تعمل الميزة المرتبطة بها عندئذ.",
          ],
        },
        {
          h: "5. لماذا نستخدم بياناتك",
          body: [
            "- إنشاء حسابك والتحقق من رقمك وتسجيل دخولك.",
            "- تنفيذ طلباتك وتوصيلها وإرسال ملخّصها إليك على واتساب.",
            "- التحقق من الدفع.",
            "- تشغيل برنامج الهدايا ومنع الغش فيه.",
            "- عرض منشوراتك وتعليقاتك ومراجعتها، واستخدام صورك وفيديوهاتك المنشورة في محتوى المطعم على مواقع التواصل الاجتماعي وفق «سياسة المحتوى».",
            "- الرد على تقييماتك وشكاواك وخدمة العملاء.",
            "- حماية الحسابات والأنظمة وكشف الاحتيال.",
            "- تحسين التطبيق ومعالجة الأعطال.",
            "- الالتزام بالمتطلبات القانونية والمحاسبية.",
            "- إرسال العروض والتسويق، فقط إذا وافقت على ذلك.",
          ],
        },
        {
          h: "6. الأساس القانوني",
          body: [
            "نعالج بياناتك بناءً على: تنفيذ الخدمة التي طلبتها، أو التزام قانوني، أو مصلحة مشروعة (مثل منع الاحتيال وحماية الأنظمة)، أو موافقتك عندما يشترط القانون ذلك (مثل التسويق). ويمكنك سحب موافقتك في أي وقت دون أن يؤثر ذلك على ما سبقه.",
          ],
        },
        {
          h: "7. مع من نشارك بياناتك",
          body: [
            "لا نبيع بياناتك. ونشارك فقط ما يلزم مع:",
            "- فريق المطعم: لتجهيز الطلبات وتوصيلها وخدمتك، كلٌّ حسب صلاحياته.",
            "- مزوّدي الخدمات التقنية الذين يعالجون البيانات نيابةً عنّا:",
            "  Neon – قاعدة البيانات – الولايات المتحدة الأمريكية.",
            "  Render – تشغيل الخادم – الولايات المتحدة الأمريكية.",
            "  Cloudflare (R2) – تخزين الصور والملفات – خوادم عالمية.",
            "  Meta (واتساب) – إرسال رموز التحقق وملخّصات الطلبات – خوادم عالمية.",
            "  OpenStreetMap – عرض الخرائط – خوادم عالمية.",
            "- الجهات الرسمية المختصة عندما يُلزمنا القانون بذلك.",
            "وقد نغيّر مزوّدي الخدمات، ومنهم نقل الاستضافة إلى مزوّد داخل الأردن، وسنحدّث هذه القائمة عند ذلك.",
          ],
        },
        {
          h: "8. نقل البيانات خارج الأردن",
          body: [
            "بما أن بعض مزوّدي الخدمات خارج الأردن، فقد تُخزّن بياناتك أو تُعالج هناك. ونلتزم في ذلك بمتطلبات القانون الأردني لنقل البيانات، ونختار مزوّدين يطبّقون معايير حماية مناسبة، منها تشفير البيانات أثناء النقل والتخزين.",
          ],
        },
        {
          h: "9. مدة الاحتفاظ",
          body: [
            "- بيانات الحساب: طوال فترة وجود الحساب.",
            "- رموز التحقق: تنتهي صلاحيتها خلال 15 دقيقة، وتُحذف خلال [[30]] يوماً.",
            "- الطلبات والفواتير: للمدة التي تفرضها قوانين الضريبة والمحاسبة الأردنية، وبعد حذف الحساب تبقى دون ما يدلّ على هويتك.",
            "- صور إثبات الدفع: [[12]] شهراً من تاريخ الطلب.",
            "- سجلّ برنامج الهدايا: [[24]] شهراً، أو حتى حذف الحساب.",
            "- المنشورات والتعليقات: حتى تحذفها أنت أو نحذفها، أو حتى حذف الحساب.",
            "- التقييمات والشكاوى: [[24]] شهراً.",
            "- سجلات الأمان والأخطاء: [[12]] شهراً.",
            "- الحسابات غير النشطة: إذا لم تستخدم التطبيق ولم تمسح أي رمز QR من رموز المطعم لمدة 6 أشهر متتالية، يحقّ للمطعم تصفية بيانات الحساب وحذف جميع الجوائز والقسائم غير المستخدمة والقطع المجمّعة.",
          ],
        },
        {
          h: "10. حماية البيانات",
          body: [
            "- تشفير الاتصال بين التطبيق والخوادم (HTTPS)، وتشفير البيانات المخزّنة لدى مزوّدي الخدمة.",
            "- حفظ كلمات السر ورموز التحقق بشكل مشفّر لا يمكن قراءته.",
            "- صلاحيات محدّدة لكل موظف حسب دوره، وسجلّ لتعديلات الموظفين.",
            "- فحص البيانات الواردة والحماية من محاولات الاختراق الشائعة.",
            "ومع ذلك، لا يوجد نظام إلكتروني آمن بالكامل، وعليك حماية جهازك وكلمة سرك.",
          ],
        },
        {
          h: "11. تسرّب البيانات",
          body: [
            "إذا وقع أي اختراق يمسّ بياناتك، سنتخذ الإجراءات اللازمة لاحتوائه، ونبلغ الجهة الرسمية المختصة وإياك وفق ما يفرضه القانون الأردني.",
          ],
        },
        {
          h: "12. حقوقك",
          body: [
            "- الاطلاع على بياناتك والحصول على نسخة منها.",
            "- تصحيح بياناتك أو تحديثها أو استكمالها.",
            "- حذف بياناتك أو إخفاء ما يدلّ على هويتك، ضمن ما يسمح به القانون.",
            "- تقييد معالجة بياناتك أو الاعتراض عليها.",
            "- نقل بياناتك حيثما ينطبق ذلك.",
            "- سحب موافقتك على التسويق في أي وقت.",
            "- تقديم شكوى إلى الجهة الرسمية المختصة بحماية البيانات في الأردن.",
            "لممارسة أي حق، تواصل معنا على contact@vrelix.net، وقد نطلب ما يثبت هويتك. ونردّ خلال المدة التي يحددها القانون.",
          ],
        },
        {
          h: "13. حذف الحساب",
          body: [
            "يمكنك حذف حسابك من صفحة «حسابي». ويُحذف عندها اسمك ونقاطك وقسائمك غير المستخدمة وسجلّ المسح، وتُفصل الحجوزات عنك، وتبقى سجلات الطلبات دون ما يدلّ على هويتك للمدة التي يفرضها القانون.",
          ],
        },
        {
          h: "14. الأطفال",
          body: [
            "التطبيق غير موجّه لمن هم دون 14 سنة، ولا يُسمح لهم بإنشاء حساب. وإذا علمنا بوجود حساب لشخص دون 14 سنة، سنحذفه مع بياناته.",
          ],
        },
        {
          h: "15. تعديل السياسة",
          body: [
            "قد نعدّل هذه السياسة عند تغيّر الخدمات أو مزوّديها أو القوانين. وعند أي تعديل جوهري، ستظهر لك في التطبيق ويلزم قبولها.",
          ],
        },
        {
          h: "16. التواصل",
          body: [
            "مطعم بيم (Beam – Shawerma & More) – عمّان، المملكة الأردنية الهاشمية",
            "المشغّل التقني للتطبيق: Virelix Solutions",
            "البريد الإلكتروني: contact@vrelix.net",
            "الهاتف: 0787844005",
            "الاسم القانوني للجهة المشغّلة: [[يُستكمل قبل النشر]]",
            "العنوان المسجّل: [[يُستكمل قبل النشر]]",
          ],
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      updated: "Last updated: 27 October 2026",
      sections: [
        {
          h: "1. Introduction",
          body: [
            "This policy explains what personal data we collect when you use the Beam app, why we collect it, who we share it with, how long we keep it and what your rights are. We comply with Jordan's Personal Data Protection Law No. (24) of 2023 and the regulations and instructions issued under it.",
          ],
        },
        {
          h: "2. Who is responsible for your data",
          body: [
            "The controller of your data is: [[legal name of Beam Restaurant]].",
            "Virelix Solutions processes the data on its behalf as technical provider, under its instructions and a written agreement between them.",
            "Data protection officer (where legally required): [[to be completed]], reachable at contact@vrelix.net.",
          ],
        },
        {
          h: "3. Data we collect",
          body: [
            "Account data: name, phone number, password (stored encrypted so it cannot be read) and app language.",
            "Order data: items, quantities, notes and prices, order type, status and date, and table number for eat-in orders.",
            "Delivery data: address, your location on the map when you pin it, and delivery instructions.",
            "Payment data: payment method and status, and the photo of the transfer receipt when you pay by CliQ. We do not collect bank card details.",
            "Gifts program data: QR scan history, collected pieces, wheel results, and vouchers and their use.",
            "Content you post: photos, posts, comments and likes in the media section.",
            "Reviews and complaints: their text, your rating and the related order.",
            "Reservations: date, time, number of people and notes.",
            "Technical data: device type, operating system, app version, and error and security logs.",
          ],
        },
        {
          h: "4. Device permissions",
          body: [
            "- Camera: to scan QR codes in the gifts program, and to take photos for posts or payment receipts if you choose to.",
            "- Location: only to pin your delivery address on the map, when you use that feature.",
            "- Photos: to choose a picture for a post or a payment receipt.",
            "You can refuse or revoke these permissions in your phone settings. The related feature may then not work.",
          ],
        },
        {
          h: "5. Why we use your data",
          body: [
            "- To create your account, verify your number and sign you in.",
            "- To fulfil and deliver your orders and send you their summary on WhatsApp.",
            "- To verify payments.",
            "- To run the gifts program and prevent cheating in it.",
            "- To display and review your posts and comments, and to use the photos and videos you post in the restaurant's social media content, as set out in the Content Policy.",
            "- To answer your reviews and complaints and provide customer service.",
            "- To protect accounts and systems and detect fraud.",
            "- To improve the app and fix faults.",
            "- To meet legal and accounting requirements.",
            "- To send offers and marketing, only if you have agreed to it.",
          ],
        },
        {
          h: "6. Legal basis",
          body: [
            "We process your data to provide the service you asked for, to meet a legal obligation, for a legitimate interest (such as preventing fraud and protecting our systems), or with your consent where the law requires it (such as marketing). You can withdraw your consent at any time without affecting processing that took place before.",
          ],
        },
        {
          h: "7. Who we share your data with",
          body: [
            "We do not sell your data. We share only what is needed with:",
            "- Restaurant staff: to prepare and deliver orders and serve you, each according to their permissions.",
            "- Technical service providers that process data on our behalf:",
            "  Neon – database – United States.",
            "  Render – server hosting – United States.",
            "  Cloudflare (R2) – image and file storage – global servers.",
            "  Meta (WhatsApp) – verification codes and order summaries – global servers.",
            "  OpenStreetMap – map display – global servers.",
            "- Competent authorities, where the law requires us to.",
            "We may change providers, including moving hosting to a provider inside Jordan, and will update this list when we do.",
          ],
        },
        {
          h: "8. Transfers outside Jordan",
          body: [
            "Because some providers are located outside Jordan, your data may be stored or processed there. We follow Jordanian legal requirements for such transfers and choose providers that apply appropriate safeguards, including encryption in transit and at rest.",
          ],
        },
        {
          h: "9. How long we keep data",
          body: [
            "- Account data: for as long as the account exists.",
            "- Verification codes: expire within 15 minutes and are deleted within [[30]] days.",
            "- Orders and invoices: for the period required by Jordanian tax and accounting laws. After account deletion they are kept without anything that identifies you.",
            "- Payment receipt photos: [[12]] months from the order date.",
            "- Gifts program history: [[24]] months, or until the account is deleted.",
            "- Posts and comments: until you or we delete them, or the account is deleted.",
            "- Reviews and complaints: [[24]] months.",
            "- Security and error logs: [[12]] months.",
            "- Inactive accounts: if you do not use the app or scan any of the restaurant's QR codes for 6 months in a row, the restaurant may clear the account's data and delete all unused prizes, vouchers and collected pieces.",
          ],
        },
        {
          h: "10. How we protect data",
          body: [
            "- Encrypted connections between the app and our servers (HTTPS), and encrypted storage at our providers.",
            "- Passwords and verification codes stored in encrypted form that cannot be read.",
            "- Role-based permissions for each staff member, and a log of staff changes.",
            "- Validation of incoming data and protection against common attacks.",
            "No electronic system is completely secure, so please protect your device and password.",
          ],
        },
        {
          h: "11. Data breaches",
          body: [
            "If a breach affects your data, we will take the necessary steps to contain it and notify the competent authority and you as required by Jordanian law.",
          ],
        },
        {
          h: "12. Your rights",
          body: [
            "- To access your data and get a copy of it.",
            "- To correct, update or complete your data.",
            "- To have your data deleted or anonymised, within what the law allows.",
            "- To restrict or object to the processing of your data.",
            "- To data portability, where applicable.",
            "- To withdraw your marketing consent at any time.",
            "- To complain to the competent data protection authority in Jordan.",
            "To exercise any of these rights, contact us at contact@vrelix.net. We may ask you to verify your identity, and we respond within the period set by law.",
          ],
        },
        {
          h: "13. Deleting your account",
          body: [
            "You can delete your account from the Account page. Your name, points, unused vouchers and scan history are then deleted, your reservations are unlinked from you, and order records are kept without anything that identifies you for the period required by law.",
          ],
        },
        {
          h: "14. Children",
          body: [
            "The app is not intended for anyone under 14, and they may not create an account. If we learn that an account belongs to someone under 14, we will delete it together with its data.",
          ],
        },
        {
          h: "15. Changes to this policy",
          body: [
            "We may update this policy when our services, providers or the law change. If we make a significant change, it will appear in the app and you will need to accept it.",
          ],
        },
        {
          h: "16. Contact",
          body: [
            "Beam Restaurant (Beam – Shawerma & More) – Amman, Hashemite Kingdom of Jordan",
            "Technical operator of the app: Virelix Solutions",
            "Email: contact@vrelix.net",
            "Phone: 0787844005",
            "Legal name of the operating entity: [[to be completed before publication]]",
            "Registered address: [[to be completed before publication]]",
          ],
        },
      ],
    },
  },
  gifts: {
    ar: {
      title: "شروط برنامج الهدايا والجوائز",
      updated: "آخر تحديث: 27 تشرين الأول 2026",
      sections: [
        {
          h: "1. فكرة البرنامج",
          body: [
            "برنامج «اجمع واربح» مجاني لأصحاب الحسابات في تطبيق بيم. يتكوّن من: جمع قطع صور الأصناف، وعجلة الحظ، وجائزة الشهر. والمشاركة فيه تعني موافقتك على هذه الشروط.",
          ],
        },
        {
          h: "2. رموز QR",
          body: [
            "- تحصل على رمز QR مع مشترياتك من المطعم، وتمسحه بكاميرا التطبيق.",
            "- كل رمز يُستخدم مرة واحدة فقط ولحساب واحد، ويجب أن يرتبط بعملية شراء فعلية.",
            "- لا يجوز تصوير الرموز أو نسخها أو نشرها أو بيعها أو مسح رموز تخص غيرك.",
          ],
        },
        {
          h: "3. جمع القطع",
          body: [
            "- لكل صنف هدية صورة مقسّمة إلى عدد من القطع (4 أو 6 أو 8 أو 12) حسب قيمة الصنف.",
            "- عند كل مسحة يختار النظام صنفاً بشكل عشوائي ويلوّن قطعاً منه: قطعة واحدة (عادي) أو 3 قطع (نادر) أو 5 قطع (نادر جداً). وتحدّد النتيجة عشوائياً من خوادمنا، ولا يمكن التأثير عليها.",
            "- لا تتكرر المسحة على صنف أكملت صورته من قبل.",
            "- عند اكتمال الصورة، تحصل على قسيمة بالصنف نفسه مجاناً.",
          ],
        },
        {
          h: "4. عجلة الحظ",
          body: [
            "- قد تحصل عند أي مسحة على فرصة لتدوير العجلة، وتُمنح الفرصة بشكل مضمون كل 11 مسحة.",
            "- جوائز العجلة قد تشمل: خصومات بنسب مختلفة، أو مشروباً، أو بطاطا، أو وجبة، أو الجائزة الكبرى، وقد تكون النتيجة «حظ أوفر».",
            "- نتيجة العجلة تُحدّد عشوائياً من خوادمنا، وما يظهر على الشاشة هو عرض للنتيجة فقط.",
          ],
        },
        {
          h: "5. جائزة الشهر",
          body: [
            "يختار المطعم كل شهر جائزة خاصة تظهر في صفحة الهدايا. وتُمنح وفق الآلية الموضّحة في التطبيق خلال ذلك الشهر، وعدد الفائزين بها محدود.",
          ],
        },
        {
          h: "6. القسائم",
          body: [
            "- تظهر قسائمك في صفحة «مكافآتي» برمز من 6 أرقام.",
            "- تُستبدل بإبراز الرمز للكاشير، وتُستخدم مرة واحدة فقط.",
            "- صلاحية القسيمة: [[30]] يوماً من تاريخ الحصول عليها، ما لم يُذكر غير ذلك.",
            "- لا تُستبدل بالنقود، ولا تُنقل إلى حساب آخر، ولا تُباع.",
            "- قسائم الخصم لا تُجمع مع عروض أخرى ما لم يُذكر غير ذلك.",
          ],
        },
        {
          h: "7. منع الغش",
          body: [
            "يحقّ للمطعم، عند الاشتباه بالتلاعب، إلغاء القطع أو القسائم المكتسبة بطريقة غير مشروعة، وتعليق الحساب أو حظره. ويشمل التلاعب: استخدام أكثر من حساب، أو مسح رموز منسوخة أو منشورة، أو استخدام برامج آلية، أو استغلال أي خلل تقني.",
          ],
        },
        {
          h: "8. تعديل البرنامج أو إيقافه",
          body: [
            "يحقّ للمطعم تعديل الأصناف المشمولة أو عدد القطع أو الجوائز أو إيقاف البرنامج، على أن يُعلن ذلك في التطبيق. وتبقى القسائم التي حصلت عليها قبل ذلك صالحة حتى انتهاء مدّتها.",
          ],
        },
        {
          h: "9. عدم النشاط لمدة 6 أشهر",
          body: [
            "إذا لم تستخدم التطبيق ولم تمسح أي رمز QR من رموز المطعم لمدة 6 أشهر متتالية، يحقّ للمطعم تصفية جميع الجوائز والقسائم غير المستخدمة والقطع المجمّعة في حسابك نهائياً، دون أي تعويض، ولا يمكن استرجاعها بعد ذلك.",
          ],
        },
        {
          h: "10. حذف الحساب",
          body: [
            "عند حذف حسابك، تُحذف القطع المجمّعة والقسائم غير المستخدمة نهائياً ولا يمكن استرجاعها.",
          ],
        },
      ],
    },
    en: {
      title: "Gifts & Rewards Terms",
      updated: "Last updated: 27 October 2026",
      sections: [
        {
          h: "1. About the program",
          body: [
            '"Collect & Win" is a free program for Beam app account holders. It has three parts: collecting the pieces of dish pictures, the lucky wheel, and the prize of the month. By taking part, you agree to these terms.',
          ],
        },
        {
          h: "2. QR codes",
          body: [
            "- You get a QR code with your purchases at the restaurant and scan it with the app's camera.",
            "- Each code can be used once only, by one account, and must be linked to a real purchase.",
            "- You may not photograph, copy, share or sell codes, or scan codes that belong to someone else.",
          ],
        },
        {
          h: "3. Collecting pieces",
          body: [
            "- Each gift dish has a picture split into a number of pieces (4, 6, 8 or 12) depending on its value.",
            "- With each scan, the system picks a dish at random and colours in pieces of it: 1 piece (common), 3 pieces (rare) or 5 pieces (super rare). The result is decided at random on our servers and cannot be influenced.",
            "- A scan never lands on a dish whose picture you have already completed.",
            "- When a picture is complete, you receive a voucher for that same dish, free.",
          ],
        },
        {
          h: "4. The lucky wheel",
          body: [
            "- Any scan may give you a chance to spin the wheel, and a spin is guaranteed every 11 scans.",
            '- Wheel prizes may include discounts of different sizes, a drink, fries, a meal or the grand prize, and the result may be "better luck next time".',
            "- The result is decided at random on our servers. The spin on screen only displays it.",
          ],
        },
        {
          h: "5. Prize of the month",
          body: [
            "Each month the restaurant chooses a special prize, shown on the Gifts page. It is awarded through the method shown in the app during that month, and the number of winners is limited.",
          ],
        },
        {
          h: "6. Vouchers",
          body: [
            "- Your vouchers appear on the My Rewards page with a 6-digit code.",
            "- You redeem a voucher by showing the code to the cashier. Each voucher can be used once.",
            "- A voucher is valid for [[30]] days from when you receive it, unless stated otherwise.",
            "- Vouchers cannot be exchanged for cash, transferred to another account or sold.",
            "- Discount vouchers cannot be combined with other offers unless stated otherwise.",
          ],
        },
        {
          h: "7. Preventing cheating",
          body: [
            "If the restaurant suspects manipulation, it may cancel pieces or vouchers obtained improperly and suspend or block the account. Manipulation includes using more than one account, scanning copied or shared codes, using automated tools, or exploiting any technical fault.",
          ],
        },
        {
          h: "8. Changes to the program",
          body: [
            "The restaurant may change the dishes included, the number of pieces or the prizes, or end the program, and will announce this in the app. Vouchers you received before the change stay valid until they expire.",
          ],
        },
        {
          h: "9. 6 months of inactivity",
          body: [
            "If you do not use the app or scan any of the restaurant's QR codes for 6 months in a row, the restaurant may permanently clear all unused prizes, vouchers and collected pieces in your account, without compensation, and they cannot be recovered afterwards.",
          ],
        },
        {
          h: "10. Deleting your account",
          body: [
            "When you delete your account, your collected pieces and unused vouchers are permanently deleted and cannot be recovered.",
          ],
        },
      ],
    },
  },
  content: {
    ar: {
      title: "سياسة المحتوى (الميديا والتعليقات والتقييمات)",
      updated: "آخر تحديث: 27 تشرين الأول 2026",
      sections: [
        {
          h: "1. ما تشمله",
          body: [
            "تنطبق هذه السياسة على كل ما تنشره في التطبيق: الصور والمنشورات في قسم الميديا، والتعليقات، والإعجابات، والتقييمات، والشكاوى.",
          ],
        },
        {
          h: "2. المحتوى المسموح",
          body: [
            "نرحّب بصورك وتجاربك الحقيقية مع أطباق المطعم، وبآرائك وتقييماتك الصادقة، الإيجابية منها والسلبية، ما دامت محترمة.",
          ],
        },
        {
          h: "3. المحتوى الممنوع",
          body: [
            "- الإساءة أو الشتم أو التهديد أو التحريض أو الكراهية.",
            "- المحتوى غير اللائق أو المخالف للآداب العامة أو للقانون.",
            "- صور أشخاص آخرين أو بياناتهم الشخصية دون إذنهم.",
            "- الإعلانات أو الروابط الترويجية أو الرسائل المتكررة.",
            "- التقييمات الوهمية أو المضللة.",
            "- المحتوى الذي يعتدي على حقوق الملكية الفكرية لغيرك.",
            "- انتحال شخصية المطعم أو موظفيه أو أي شخص آخر.",
          ],
        },
        {
          h: "4. المراجعة والنشر",
          body: [
            "- قد تخضع المنشورات لمراجعة فريق المطعم قبل ظهورها للآخرين.",
            "- يحقّ للمطعم رفض أي منشور أو تعليق، أو إخفاؤه أو حذفه، إذا خالف هذه السياسة، دون إشعار مسبق.",
            "- يمكنك الإبلاغ عن أي محتوى مخالف، وسنراجعه في أقرب وقت.",
            "- قد يؤدي تكرار المخالفة إلى منعك من النشر أو تعليق حسابك.",
          ],
        },
        {
          h: "5. حقوق المحتوى واستخدامه خارج التطبيق",
          body: [
            "يبقى المحتوى الذي تنشره ملكاً لك. وبنشرك صوراً أو فيديوهات في قسم الميديا وموافقتك على هذه السياسة، فإنك تمنح إدارة المطعم إذناً مجانياً وغير حصري، غير محدود بمدة أو مكان، بما يلي:",
            "- عرض المحتوى داخل التطبيق.",
            "- نسخه وأخذه خارج التطبيق، وتعديله ومونتاجه وقصّه ودمجه مع محتوى آخر.",
            "- نشره على حسابات المطعم في مواقع التواصل الاجتماعي وموقعه الإلكتروني، واستخدامه في محتواه التسويقي والإعلاني.",
            "ولا يحقّ لك المطالبة بأي مقابل أو تعويض عن هذا الاستخدام، ويكون المطعم خارج المسؤولية القانونية عن استخدامه للمحتوى ضمن حدود هذا الإذن.",
            "- تؤكد بنشرك أن المحتوى من تصويرك، وأن لديك موافقة كل شخص يظهر فيه على نشره وعلى استخدامه بالطريقة الموضّحة هنا.",
            "- يمكنك حذف منشوراتك وتعليقاتك من التطبيق في أي وقت، ولا يلتزم المطعم بحذف ما نشره منها خارج التطبيق قبل الحذف.",
          ],
        },
        {
          h: "6. التقييمات والشكاوى",
          body: [
            "- تصل التقييمات والشكاوى إلى إدارة المطعم فقط، ولا تُنشر للعامة.",
            "- نراجع كل شكوى ونتواصل معك عند الحاجة على رقمك المسجّل.",
            "- نرجو ألا تكتب في الشكوى بيانات حسّاسة أو بيانات بطاقتك البنكية.",
          ],
        },
        {
          h: "7. مسؤوليتك",
          body: [
            "أنت مسؤول عن المحتوى الذي تنشره. ولا يعبّر محتوى المستخدمين عن رأي المطعم.",
          ],
        },
      ],
    },
    en: {
      title: "Content Policy (Media, Comments and Reviews)",
      updated: "Last updated: 27 October 2026",
      sections: [
        {
          h: "1. What this covers",
          body: [
            "This policy applies to everything you post in the app: photos and posts in the media section, comments, likes, reviews and complaints.",
          ],
        },
        {
          h: "2. What is welcome",
          body: [
            "We welcome your real photos and experiences with the restaurant's dishes, and your honest opinions and reviews, positive or negative, as long as they are respectful.",
          ],
        },
        {
          h: "3. What is not allowed",
          body: [
            "- Abuse, insults, threats, incitement or hate.",
            "- Indecent content, or content that breaks public morals or the law.",
            "- Photos or personal details of other people without their permission.",
            "- Advertising, promotional links or repeated messages.",
            "- Fake or misleading reviews.",
            "- Content that infringes someone else's intellectual property.",
            "- Impersonating the restaurant, its staff or anyone else.",
          ],
        },
        {
          h: "4. Review and publication",
          body: [
            "- Posts may be reviewed by restaurant staff before they are shown to others.",
            "- The restaurant may reject, hide or delete any post or comment that breaks this policy, without prior notice.",
            "- You can report any content that breaks this policy, and we will review it as soon as we can.",
            "- Repeated violations may lead to a ban on posting or suspension of your account.",
          ],
        },
        {
          h: "5. Rights to your content",
          body: [
            "Your content remains yours. By posting photos or videos in the Media section and agreeing to this policy, you give the restaurant's management a free, non-exclusive permission, with no time or place limit, to:",
            "- Show the content inside the app.",
            "- Copy and take it outside the app, and edit, cut, trim and combine it with other content.",
            "- Publish it on the restaurant's social media accounts and website, and use it in its marketing and advertising content.",
            "You may not claim any payment or compensation for this use, and the restaurant bears no legal liability for using the content within this permission.",
            "- By posting, you confirm that you took the content yourself and that every person in it has agreed to it being posted and used as described here.",
            "- You can delete your posts and comments from the app at any time. The restaurant is not required to remove anything it published outside the app before you deleted it.",
          ],
        },
        {
          h: "6. Reviews and complaints",
          body: [
            "- Reviews and complaints go to restaurant management only and are not shown publicly.",
            "- We review every complaint and contact you on your registered number when needed.",
            "- Please do not include sensitive information or bank card details in a complaint.",
          ],
        },
        {
          h: "7. Your responsibility",
          body: [
            "You are responsible for the content you post. User content does not represent the restaurant's views.",
          ],
        },
      ],
    },
  },
  refunds: {
    ar: {
      title: "سياسة تعديل الطلبات وإلغائها والاسترجاع",
      updated: "آخر تحديث: 27 تشرين الأول 2026",
      sections: [
        {
          h: "1. تعديل الطلب",
          body: [
            "يمكنك تعديل طلبك بعد تأكيده من صفحة السلة أو من رابط «عدّل طلبك» في رسالة واتساب، حسب حالة الطلب:",
          ],
        },
        {
          table: {
            head: ["حالة الطلب", "ما يمكنك فعله"],
            rows: [
              [
                "بانتظار المطعم / تم القبول",
                "تعديل الطلب كاملاً: تغيير الكميات أو حذف أصناف أو إضافتها، أو تغيير طريقة الاستلام والدفع",
              ],
              [
                "قيد التجهيز",
                "الإضافة على الطلب فقط. لا يمكن تغيير أو حذف ما بدأ المطبخ بتجهيزه",
              ],
              [
                "جاهز / في الطريق / مكتمل",
                "لا يمكن التعديل أو الإضافة، ويمكنك التواصل مع المطعم",
              ],
            ],
          },
        },
        {
          h: "",
          body: [
            "- يُعاد حساب المجموع تلقائياً بعد كل تعديل أو إضافة، ويصلك ملخّص محدّث على واتساب.",
            "- الأصناف المضافة أثناء التجهيز تُعلَّم للمطبخ بأنها «إضافة على الطلب» وتُجهّز بأسرع وقت ممكن.",
          ],
        },
        {
          h: "2. إلغاء الطلب",
          body: [
            "- يمكن إلغاء الطلب قبل أن يبدأ المطبخ بتجهيزه، بالتواصل مع المطعم أو من التطبيق إن كانت الميزة متاحة.",
            "- بعد بدء التجهيز، لا يمكن إلغاء الطلب لأن الطعام يُحضّر خصيصاً لك.",
            "- يحقّ للمطعم إلغاء الطلب في الحالات المذكورة في الشروط والأحكام، ويُعاد أي مبلغ مدفوع كاملاً.",
          ],
        },
        {
          h: "3. الاسترجاع",
          body: [
            "يُعاد لك المبلغ كاملاً في الحالتين التاليتين:",
            "- إلغاء الطلب قبل بدء التجهيز.",
            "- إلغاء المطعم للطلب.",
            "أما الطلب الذي فيه مشكلة، فلا يُعاد مبلغه إلا بعد أن يتحقق المطعم بنفسه من وجود المشكلة فعلاً، مثل:",
            "- وصول وجبة خاطئة غير التي طلبتها، أو صنف ناقص.",
            "- وجود شعرة أو جسم غريب في الطعام.",
            "- وجود مشكلة واضحة في جودة الطعام أو سلامته.",
            "ويُشترط للتحقق: الإبلاغ خلال [[ساعتين]] من الاستلام، مع صورة واضحة للمشكلة، والاحتفاظ بالطلب أو بما تبقّى منه لحين مراجعته إن طلب المطعم ذلك. ويعود قرار قبول الاسترجاع أو رفضه للمطعم بعد التحقق.",
            "ويُعاد المبلغ على النحو التالي:",
            "- الدفع بكليك: يُعاد إلى الحساب نفسه الذي حُوّل منه خلال [[7]] أيام عمل.",
            "- الدفع النقدي: يُعاد نقداً في المطعم، أو كرصيد أو قسيمة على طلبك القادم حسب اختيارك.",
            "وقد يعرض المطعم بدلاً من الاسترجاع إعادة تجهيز الصنف أو استبداله إن وافقت على ذلك.",
          ],
        },
        {
          h: "4. حالات لا يشملها الاسترجاع",
          body: [
            "- تغيير رأيك بعد بدء التجهيز.",
            "- عنوان خاطئ أو عدم الرد على المندوب.",
            "- التأخر في استلام طلبات الاستلام من المطعم.",
            "- الاختلاف البسيط في شكل الطبق عن صورته.",
            "- الشكاوى التي لا يثبت المطعم بعد التحقق وجود مشكلة فيها.",
          ],
        },
        {
          h: "5. القسائم والجوائز",
          body: [
            "القسائم والجوائز المجانية لا تُستبدل بالنقود ولا تُسترجع. وإذا أُلغي طلب استُخدمت فيه قسيمة، تُعاد القسيمة إلى حسابك إن كانت لا تزال صالحة.",
          ],
        },
        {
          h: "6. كيف تطلب الاسترجاع",
          body: [
            "أرسل شكوى من صفحة «حسابي» في التطبيق، أو تواصل معنا على contact@vrelix.net أو 0787844005، مع رقم الطلب ووصف المشكلة وصورة إن أمكن. ونردّ عليك خلال [[يومي عمل]].",
          ],
        },
        {
          h: "7. حقوقك القانونية",
          body: [
            "لا تحدّ هذه السياسة من أي حق يكفله لك قانون حماية المستهلك الأردني.",
          ],
        },
      ],
    },
    en: {
      title: "Order Changes, Cancellation & Refund Policy",
      updated: "Last updated: 27 October 2026",
      sections: [
        {
          h: "1. Changing your order",
          body: [
            'After your order is confirmed, you can change it from the cart page or from the "edit your order" link in the WhatsApp message, depending on its status:',
          ],
        },
        {
          table: {
            head: ["Order status", "What you can do"],
            rows: [
              [
                "Waiting for the restaurant / Accepted",
                "Change the order completely: quantities, removing or adding items, pickup or delivery, and payment method",
              ],
              [
                "Being prepared",
                "Add to the order only. Items the kitchen has started cannot be changed or removed",
              ],
              [
                "Ready / On the way / Completed",
                "No changes or additions. You can contact the restaurant",
              ],
            ],
          },
        },
        {
          h: "",
          body: [
            "- The total is recalculated automatically after each change or addition, and an updated summary is sent to you on WhatsApp.",
            '- Items added while the order is being prepared are marked for the kitchen as "added to order" and prepared as quickly as possible.',
          ],
        },
        {
          h: "2. Cancelling your order",
          body: [
            "- An order can be cancelled before the kitchen starts preparing it, by contacting the restaurant or in the app where this feature is available.",
            "- Once preparation has started, the order cannot be cancelled, because the food is being made for you.",
            "- The restaurant may cancel an order in the cases set out in the Terms and Conditions, and any amount paid is refunded in full.",
          ],
        },
        {
          h: "3. Refunds",
          body: [
            "You get a full refund in these two cases:",
            "- You cancel the order before preparation starts.",
            "- The restaurant cancels the order.",
            "For an order with a problem, the money is refunded only after the restaurant has itself verified that the problem is real, for example:",
            "- You received the wrong meal, or an item is missing.",
            "- There is a hair or a foreign object in the food.",
            "- There is a clear problem with the food's quality or safety.",
            "To verify it: report it within [[2 hours]] of receiving the order, with a clear photo of the problem, and keep the order or what is left of it for review if the restaurant asks. The restaurant decides whether to accept or refuse the refund after verifying.",
            "Refunds are made as follows:",
            "- CliQ payments: refunded to the same account the transfer came from within [[7]] working days.",
            "- Cash payments: refunded in cash at the restaurant, or as credit or a voucher on your next order, as you prefer.",
            "Instead of a refund, the restaurant may offer to remake or replace the item if you agree.",
          ],
        },
        {
          h: "4. When refunds do not apply",
          body: [
            "- Changing your mind after preparation has started.",
            "- A wrong address, or not answering the driver.",
            "- Collecting a pickup order late.",
            "- Small differences between how a dish looks and its photo.",
            "- Complaints where the restaurant finds no problem after verifying.",
          ],
        },
        {
          h: "5. Vouchers and prizes",
          body: [
            "Free vouchers and prizes cannot be exchanged for cash or refunded. If an order that used a voucher is cancelled, the voucher is returned to your account if it is still valid.",
          ],
        },
        {
          h: "6. How to request a refund",
          body: [
            "Send a complaint from the Account page in the app, or contact us at contact@vrelix.net or 0787844005, with the order number, a description of the problem and a photo if possible. We reply within [[2 working days]].",
          ],
        },
        {
          h: "7. Your legal rights",
          body: [
            "This policy does not limit any right you have under Jordan's Consumer Protection Law.",
          ],
        },
      ],
    },
  },
};
