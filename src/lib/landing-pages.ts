import type { Faq } from "@/lib/storefront";

export type LandingPageData = {
  slug: string;
  section: "gifts" | "custom-gifts";
  route: string;
  /** Short label for cards and breadcrumbs. */
  label: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  description: string;
  productSlug: string;
  image: string;
  imageAlt: string;
  body: { heading: string; text: string }[];
  faqs: Faq[];
};


const page = (data: Omit<LandingPageData, "route">): LandingPageData => ({ ...data, route: `/${data.section}/${data.slug}` });

export const landingPages: LandingPageData[] = [
  page({
    slug: "anniversary-string-art-portrait", section: "gifts", label: "Anniversary gifts",
    metaTitle: "Anniversary String Art Portrait — Handmade Gift From Your Photo",
    metaDescription: "A handmade string-art portrait of the two of you for your anniversary. Approve a digital preview first, free insured delivery across India.",
    eyebrow: "For the years you’ve built together", title: "An anniversary portrait, made by hand.",
    description: "Turn a photograph you both love into a handmade 24-inch string-art portrait. Approve your digital preview, and give them a keepsake made just for your story.",
    productSlug: "double-face-string-art-portrait", image: "/art/portrait-couple-1.jpg", imageAlt: "A hand-threaded string-art portrait of a smiling couple in a 24-inch circle",
    body: [
      { heading: "A gift that took time — like the years it celebrates", text: "Flowers fade and gadgets date. A string-art portrait is threaded line by line over many hours, which is exactly why it feels right for an anniversary. Add a date or a few words in your notes and the artist will work them into the design." },
      { heading: "Which photo works best?", text: "Wedding photos, a favourite holiday picture or a candid moment all work well. Choose one where both faces are clear and well lit; the artist will handle the background." },
    ],
    faqs: [
      { question: "Can it arrive in time for our anniversary?", answer: "Allow around 2–3 working days for your preview and 5–7 working days to make it after approval, plus delivery. Order two to three weeks ahead and mention your date in the notes so we can prioritise it." },
      { question: "Can you add our wedding date or names?", answer: "Yes. Add the text in “Notes for the artist” and it will appear on your digital preview for approval." },
    ],
  }),
  page({
    slug: "thread-art-for-couples", section: "gifts", label: "Gifts for couples",
    metaTitle: "Thread Art for Couples — Custom Couple Portrait in String",
    metaDescription: "Custom thread art of you and your partner, mapped and threaded by hand from your photo. Digital preview before making, handmade in India.",
    eyebrow: "A little piece of the two of you", title: "Your favorite person, in thread.",
    description: "Make a meaningful gift from a photograph of you together. Each couple portrait is mapped, threaded and framed by hand, with a digital preview for your approval.",
    productSlug: "double-face-string-art-portrait", image: "/art/portrait-couple-2.jpg", imageAlt: "A string-art portrait of two friends cheek to cheek, threaded by hand",
    body: [
      { heading: "Made for two, made by one pair of hands", text: "Every couple portrait is made by a single artisan, from the first pin to the final knot. The thread follows your photograph, so the result is unmistakably you — not a template." },
      { heading: "For birthdays, Valentine’s Day or just because", text: "A couple portrait suits any occasion that celebrates the two of you. Upload your favorite photo of the two of you and add a short note for the artist if there is a detail you would love to keep." },
    ],
    faqs: [
      { question: "Can you combine two separate photos into one portrait?", answer: "Often, yes. Upload the main photo at checkout and describe the second one in your notes; our artist will confirm by email if a combined portrait will work well." },
      { question: "How big is a couple portrait?", answer: "Every portrait is a 24-inch circle. For two people, a photo with your faces close together gives the clearest result." },
    ],
  }),
  page({
    slug: "wedding-string-art-gift", section: "gifts", label: "Wedding gifts",
    metaTitle: "Wedding String Art Gift — Personalised Portrait for the Couple",
    metaDescription: "A personalised wedding gift they will actually keep: a handmade string-art portrait from a photo of the couple. Preview first, free delivery in India.",
    eyebrow: "For the first day of forever", title: "A wedding gift they will keep for a lifetime.",
    description: "Give the newlyweds a portrait made from their own photograph, threaded by hand and framed in wood. You approve the preview, we make it and deliver it — gift note included.",
    productSlug: "double-face-string-art-portrait", image: "/art/portrait-couple-3.jpg", imageAlt: "A hand-threaded string-art portrait of a couple, made as a wedding keepsake",
    body: [
      { heading: "Stand out from the gift table", text: "A handmade portrait of the couple is personal in a way a registry item cannot be. Use an engagement photo, a pre-wedding shoot or a picture from the ceremony itself." },
      { heading: "Ship it straight to them", text: "Enter their address at checkout and add a gift note. Prices are never printed on the packaging." },
    ],
    faqs: [
      { question: "Can I send the portrait directly to the couple?", answer: "Yes. Enter their delivery address at checkout and add a gift note; you will still receive the preview and tracking updates in your own account." },
      { question: "Can a group of friends order it together?", answer: "Yes — one person places the order and receives the preview to approve on behalf of the group." },
    ],
  }),
  page({
    slug: "string-art-gift-for-parents", section: "gifts", label: "Gifts for parents",
    metaTitle: "String Art Gift for Parents — Handmade Family Portrait",
    metaDescription: "A handmade string-art family portrait for your parents, made from a photo you love. Approve the preview first; free insured delivery across India.",
    eyebrow: "For the people who started it all", title: "A family portrait your parents will treasure.",
    description: "Turn an old family photograph or a recent get-together into a handmade thread portrait for your parents — for an anniversary, a milestone birthday or simply to say thank you.",
    productSlug: "family-string-art-portrait", image: "/art/portrait-family-3.jpg", imageAlt: "A string-art family portrait of parents with their baby, threaded by hand",
    body: [
      { heading: "Old photos welcome", text: "A scanned print from the family album works beautifully. If the photo is faded or small, mention it in your notes and the artist will boost the contrast before mapping it." },
      { heading: "Bring everyone into one frame", text: "Faces read best when they fill the 24-inch circle, so for groups choose a photo where everyone stands close together." },
    ],
    faqs: [
      { question: "Can you work from an old printed photograph?", answer: "Yes. Photograph or scan the print in good light, without glare, and upload it at checkout. The artist will let you know if anything needs adjusting." },
      { question: "How many people can be in one portrait?", answer: "Two to four people work best in a 24-inch circle. For bigger families, mention it in the notes and we will advise before making." },
    ],
  }),
  page({
    slug: "birthday-string-art-portrait", section: "gifts", label: "Birthday gifts",
    metaTitle: "Birthday String Art Portrait — Personalised Handmade Gift",
    metaDescription: "A personalised birthday gift made by hand: a string-art portrait from their favourite photo. Digital preview first, free insured delivery in India.",
    eyebrow: "For a birthday worth remembering", title: "A birthday gift made from their favorite photo.",
    description: "Skip the last-minute gift card. A handmade string-art portrait shows you thought about it — and it will still be on their wall long after the cake is gone.",
    productSlug: "single-face-string-art-portrait", image: "/art/portrait-studio-smile.jpg", imageAlt: "A hand-threaded 24-inch string-art portrait of a smiling woman",
    body: [
      { heading: "A statement for their wall", text: "Every portrait is a 24-inch circle, big enough to be the centrepiece of a room and threaded with the same care, line by line." },
      { heading: "Milestone birthdays", text: "For a 30th, 50th or 60th, add the number or a short message in the notes and it will be part of the preview you approve." },
    ],
    faqs: [
      { question: "What is the quickest way to get it in time?", answer: "Order as early as you can and approve the preview promptly — the making only starts once you approve. Mention the birthday date in your notes." },
      { question: "Can I add a short message?", answer: "Yes. Add it in the notes for the artist and it will appear on your digital preview." },
    ],
  }),
  page({
    slug: "best-friend-string-art-gift", section: "gifts", label: "Gifts for best friends",
    metaTitle: "Best Friend Gift — Handmade String Art Portrait of You Two",
    metaDescription: "A best friend gift they will never forget: a handmade string-art portrait of the two of you, threaded from your favourite photo. Free delivery in India.",
    eyebrow: "For the one who knows all your stories", title: "A best friend gift, made by hand.",
    description: "Turn your favourite photo together into a 24-inch string-art portrait. Perfect for birthdays, Friendship Day, farewells, or just because they deserve it.",
    productSlug: "double-face-string-art-portrait", image: "/art/portrait-couple-4.jpg", imageAlt: "A hand-threaded string-art portrait of two best friends smiling together",
    body: [
      { heading: "Better than another gift card", text: "Years of inside jokes, late-night calls and shared memories deserve more than a last-minute gift. A handmade portrait of the two of you says it all, and it stays on their wall for years." },
      { heading: "Choosing the right photo", text: "Pick a photo where both your faces are clear, close together and well lit. Selfies work beautifully. Our artist handles the background and sends you a digital preview first." },
    ],
    faqs: [
      { question: "Can I send it directly to my friend?", answer: "Yes. Enter their address at checkout and add a gift note. You still receive the preview to approve and the tracking updates." },
      { question: "Can we add a message or date?", answer: "Yes. Add a short line, such as “Friends since 2015”, in the notes for the artist and it will appear on your digital preview." },
    ],
  }),
  page({
    slug: "handmade-string-art-india", section: "custom-gifts", label: "Handmade in India",
    metaTitle: "Handmade String Art in India — Custom Portrait From Your Photo",
    metaDescription: "Custom handmade 24-inch string art made in India from your photo. Approve a digital preview, and get free insured delivery nationwide.",
    eyebrow: "Thoughtfully made in India", title: "A custom handmade gift, made from your photo.",
    description: "Create a custom string-art portrait from a favorite photograph. Upload your photo, review the digital draft, and let an artisan make your keepsake by hand in India.",
    productSlug: "family-string-art-portrait", image: "/art/craftkiya-easel-portrait.jpg", imageAlt: "A finished Craftkiya string-art portrait on a wooden easel, handmade in India",
    body: [
      { heading: "Real craft, not a print", text: "Every Craftkiya portrait is made by hand: pins hammered into wood, thread wound line by line. No printers, no machines, no shortcuts." },
      { heading: "Delivered anywhere in India", text: "We ship insured to every serviceable pincode in India, free of charge, with tracking in your account from dispatch to delivery." },
    ],
    faqs: [
      { question: "Where are Craftkiya portraits made?", answer: "Every portrait is designed and threaded by hand in our studio in India." },
      { question: "Do you deliver across India?", answer: "Yes. Delivery is free and insured to all serviceable pincodes, with tracking shared in your account." },
    ],
  }),
  page({
    slug: "custom-thread-art-portrait-from-photo", section: "custom-gifts", label: "Thread art from a photo",
    metaTitle: "Custom Thread Art Portrait From Your Photo — Made by Hand",
    metaDescription: "Upload a photo and get a custom thread-art portrait, mapped by an artist and threaded by hand. See a digital preview before we begin.",
    eyebrow: "From your camera roll to your wall", title: "Custom thread art, made from your photo.",
    description: "Upload any clear photograph and our artist turns it into a thread pattern — then builds it by hand, one line at a time. You approve the digital draft before anything is made.",
    productSlug: "family-string-art-portrait", image: "/art/portrait-family-2.jpg", imageAlt: "A family photo turned into a hand-threaded string-art portrait",
    body: [
      { heading: "How a photo becomes thread art", text: "We convert your photo into a high-contrast map, plan where each pin goes and calculate the path of the thread. You see this digital draft first; once approved, it is threaded by hand." },
      { heading: "Your photo stays private", text: "Uploads go to a private, access-controlled folder visible only to you and our studio team. We never share your photo without written permission." },
    ],
    faqs: [
      { question: "What resolution should my photo be?", answer: "Any recent phone photo is fine. As a rule of thumb, the shortest side should be at least 1000 pixels; the uploader will warn you if a photo looks small." },
      { question: "Can I see what it will look like first?", answer: "Yes — the configurator shows a live frame preview, and our artist sends a full digital draft for approval before making." },
    ],
  }),
];

export const getLandingPage = (section: LandingPageData["section"], slug: string) => landingPages.find((item) => item.section === section && item.slug === slug) || null;
