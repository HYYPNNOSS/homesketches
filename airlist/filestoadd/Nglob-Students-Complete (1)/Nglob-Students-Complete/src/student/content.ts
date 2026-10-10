import type { InfoDialogContent } from './types';

export const pageMeta = {
  title: 'Student Moving & Summer Storage | Nglob',
  description:
    'A few boxes, a student room or a summer gap between homes. Explore moving help, storage, price factors and a simple one-document student check with Nglob.',
};

export const faqs: readonly { question: string; answer: string }[] = [
  {
    question: 'Can I book a move for just a few boxes?',
    answer:
      'Yes. List the boxes, bags and other things you need moved. Include quantities, larger furniture and anything heavy or fragile so your quote reflects what is coming.',
  },
  {
    question: 'What affects the cost of a student move?',
    answer:
      'Your items, route, date, access and selected help all shape the price. Include stairs, lifts, parking and the walk to the van. Check packing, materials and storage separately, then review the estimated total before booking.',
  },
  {
    question: 'Is carrying, packing or furniture assembly included?',
    answer:
      'It depends on the help you select and the agreed service. Packing, materials, dismantling and assembly are not included in every booking. Tell us what you need and check that it appears in your quote.',
  },
  {
    question: 'Can I store things over summer and return them elsewhere?',
    answer:
      'You can request collection, storage and return for the gap between homes. Give your expected dates and return location. A different address can be planned and priced; check availability, building access and each part of the quote before agreeing.',
  },
  {
    question: 'What if my dates or item list change?',
    answer:
      'Tell Nglob as soon as you know. A different date, address, item list or level of help can affect availability and price. Check the updated arrangements before relying on them; a request alone does not reserve a new date.',
  },
  {
    question: 'What do I need to prove I’m a student?',
    answer:
      'Any one suitable document showing your name, institution and current student status. A student card, enrolment letter or student-portal screenshot can work; these are examples, not the only options. If the details are missing, replace it with one suitable document.',
  },
  {
    question: 'Do I need a university email address?',
    answer:
      'No university email is needed for this document-based check. Your document needs to show that you are currently studying. You do not need to provide a passport, bank statement or second identity document.',
  },
  {
    question: 'What student offer will I get?',
    answer:
      'Check the student offer available to you and its conditions before booking. A student-status check does not itself apply a discount or create a booking. Review the confirmed offer alongside your moving quote.',
  },
  {
    question: 'Can I combine a student offer with a referral saving?',
    answer:
      'Check the offer shown for your booking and the programme terms. They explain which savings apply and whether they can be combined. Review the confirmed saving in your quote before booking.',
  },
  {
    question: 'When is referral credit added, and is it cash?',
    answer:
      'Eligible referral credit is added after your friend’s move is completed and fully paid. Find your personal referral link and available credit in your account. Clicks and sign-ups alone do not earn credit. Use Nglob Credit towards eligible Nglob services; it cannot be withdrawn as cash.',
  },
];

export const checklists: readonly { title: string; items: readonly string[] }[] = [
  {
    title: 'Before you book',
    items: [
      'Confirm your keys, move-in time and building access.',
      'Count boxes and bags. Measure bulky furniture.',
      'Check stairs, lifts, parking and the walk to the van.',
      'Check that the packing, carrying or furniture help you need is in your quote.',
    ],
  },
  {
    title: 'While you pack',
    items: [
      'Label boxes by room and keep them manageable to lift.',
      'Keep screws and fittings in a labelled bag with their furniture.',
      'Protect fragile items and flag anything needing special care.',
      'Keep medicines, documents, chargers and an overnight bag with you.',
    ],
  },
  {
    title: 'On moving day',
    items: [
      'Keep your phone charged and your keys within reach.',
      'Arrange for someone to meet the team at both addresses.',
      'Keep paths clear and confirm any lift or loading slot.',
      'Check cupboards, drawers and sockets before you leave.',
    ],
  },
];

export const infoDialogs: readonly InfoDialogContent[] = [
  {
    key: 'halls',
    title: 'First keys. A little less guesswork.',
    intro: 'A few boxes, a suitcase or a room’s worth of things. Start with what you are bringing.',
    sections: [
      {
        items: [
          'Check your arrival slot and where to collect your keys.',
          'Count boxes and bags. Add larger items separately.',
          'Note stairs, lifts and where the van can stop.',
          'Check the carrying or packing help included in your quote.',
        ],
      },
      {
        heading: 'One useful thing to check',
        paragraphs: [
          'Arrange any lift or loading-bay reservation with your accommodation. A moving booking does not reserve these for you.',
        ],
      },
    ],
    primary: 'quote',
    primaryLabel: 'Get a moving quote',
  },
  {
    key: 'flatshare',
    title: 'Your corner of the flat. All accounted for.',
    intro:
      'Bring the familiar things that make your new place yours. A clear item list helps everyone plan.',
    sections: [
      {
        items: [
          'Agree what each person is bringing.',
          'Measure larger furniture and flag heavy or fragile items.',
          'Say what needs taking apart or putting back together.',
          'Arrange who will meet the team at each address.',
        ],
      },
      {
        paragraphs: [
          'Check carrying, packing and furniture work in your agreed service. They are not included in every booking.',
        ],
      },
    ],
    primary: 'quote',
    primaryLabel: 'Get a moving quote',
  },
  {
    key: 'summer',
    title: 'Term’s over. What’s the plan?',
    intro:
      'Heading home, moving straight to a new place or leaving things in storage? Start with where you need them next.',
    sections: [
      {
        items: [
          'Moving home: list your things and the delivery address.',
          'Between homes: note your move-out date and expected return date.',
          'Using storage: check collection, storage and return separately.',
        ],
      },
      {
        paragraphs: [
          'Keep anything you will need during the break with you, including medication and important documents.',
        ],
      },
    ],
    primary: 'quote',
    primaryLabel: 'Get a moving quote',
  },
  {
    key: 'storage',
    title: 'A plan for the gap between homes.',
    intro:
      'You do not need every box on the train home. Explore collection, storage and return between moving out and getting your next keys.',
    sections: [
      {
        items: [
          'List the boxes, bags and furniture you want to store.',
          'Give your collection date and expected storage period.',
          'Add the return address if you know it, or explain what is undecided.',
          'Include floors, lifts and loading arrangements.',
        ],
      },
      {
        heading: 'Check all three parts',
        paragraphs: [
          'Review collection, storage and return separately in your quote. Check the billing period, any minimum term and notice needed for a return. Extra handling and a different return address can affect the price.',
          'Check accepted items before packing. Nglob collects and returns your things; customers do not have access to the storage facilities. Ask about options and charges for returning only some items.',
        ],
      },
    ],
    primary: 'quote',
    primaryLabel: 'Get a moving quote',
  },
  {
    key: 'pricing',
    title: 'What shapes your moving price?',
    intro: 'A useful quote starts with the right details.',
    sections: [
      {
        items: [
          'Your things: quantities, sizes, weight and special handling.',
          'Your route and timing: addresses, date and available options.',
          'Your access: stairs, lifts, parking and carrying distance.',
          'Your help: the crew, packing, materials or furniture work you select.',
        ],
      },
      {
        paragraphs: [
          'Review the estimated total and selected services before booking. If your plans change, tell Nglob so the service and any price change can be agreed.',
        ],
      },
    ],
    primary: 'quote',
    primaryLabel: 'Get a moving quote',
  },
  {
    key: 'proof',
    title: 'One document that says “I’m a student”.',
    intro:
      'Choose any one suitable document showing your name, institution and current student status. Use whichever is easiest.',
    sections: [
      {
        heading: 'A few examples',
        items: [
          'A student card showing that your status is current.',
          'An enrolment or student-status letter from your institution.',
          'A student-portal screenshot showing current enrolment.',
          'Another document from your institution showing the same details.',
        ],
      },
      {
        heading: 'Keep the useful parts. Hide the rest.',
        paragraphs: [
          'You can cover your address, date of birth, student number, QR codes, grades and financial details. Keep your name, institution and current student status readable.',
        ],
      },
      {
        paragraphs: [
          'If something is missing, replace the file with one suitable document. A passport or bank statement alone does not show that you are a student.',
        ],
      },
    ],
    primary: 'verify',
    primaryLabel: 'Choose my document',
  },
  {
    key: 'rewards',
    title: '12% to share. You choose the split.',
    intro:
      'You choose how to share 12%: a referral saving for your friend and Nglob Credit for your next move.',
    sections: [
      {
        heading: 'How credit becomes available',
        items: [
          'Find your personal referral link and available options in your account.',
          'Your friend applies your referral before confirming their booking.',
          'Eligible credit is added after their move is completed and fully paid. Clicks and sign-ups alone do not earn it.',
          'Credit is for eligible Nglob services. It cannot be withdrawn as cash.',
        ],
      },
      {
        heading: 'Choose what works for you',
        paragraphs: [
          'You could share 6% with your friend and keep 6% in credit, or give your friend 2% and keep 10%. The slider on this page explores examples. Set your actual split in your account, where you can check the available options and how each benefit is calculated.',
        ],
      },
      {
        heading: 'Check the offer before booking',
        paragraphs: [
          'Review the offer shown for the booking. The programme terms explain eligible charges, whether offers can be combined and how cancellations or refunds affect credit.',
        ],
      },
      {
        heading: 'A head start for next time',
        paragraphs: [
          'You can build credit towards the value of your own move and keep earning beyond it. Use eligible credit for future Nglob services or give it to a friend under the programme rules. Available credit and progress towards your move are shown separately in your account.',
        ],
      },
      {
        paragraphs: [
          'When you share your link, say you may receive Nglob Credit. There is no need to send us your friend’s contact details.',
        ],
      },
    ],
    primary: 'account',
    primaryLabel: 'Open my account',
  },
];

export function copyChecklistText(): string {
  return checklists
    .map(({ title, items }) => `${title}\n${items.map((item) => `☐ ${item}`).join('\n')}`)
    .join('\n\n');
}
