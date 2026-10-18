// Wedding Planning Starter Template
// Calculates realistic start & end dates relative to the couple's wedding date
function getStarterWeddingTasks(weddingDateStr) {
  const wedding = new Date(weddingDateStr || '2027-06-20');
  
  function subtractDays(d, days) {
    const res = new Date(d);
    res.setDate(res.getDate() - days);
    return res.toISOString().split('T')[0];
  }

  return [
    // 10 - 12 Months Before
    {
      _tempId: 't1',
      title: 'Align on Wedding Vision & Master Guest List',
      category: 'General Planning',
      start_date: subtractDays(wedding, 360),
      end_date: subtractDays(wedding, 330),
      is_milestone: false,
      status: 'todo',
      progress: 0,
      assignee: 'both',
      priority: 'urgent',
      notes: 'Align on vision, wedding party size, and draft master guest list.',
      checklist: [
        { id: 'c1', text: 'Discuss aesthetic, season, and overall vibe', completed: false },
        { id: 'c2', text: 'Create draft guest list spreadsheet', completed: false }
      ]
    },
    {
      _tempId: 't2',
      title: 'Tour & Book Ceremony & Reception Venue',
      category: 'Venue & Reception',
      start_date: subtractDays(wedding, 340),
      end_date: subtractDays(wedding, 290),
      is_milestone: true,
      status: 'todo',
      progress: 0,
      assignee: 'both',
      priority: 'urgent',
      notes: 'Visit top 3 venue contenders and pay deposit to lock in date.',
      checklist: [
        { id: 'c3', text: 'Schedule venue visits', completed: false },
        { id: 'c4', text: 'Confirm capacity, sound rules & alcohol policy', completed: false },
        { id: 'c5', text: 'Sign contract and pay venue deposit', completed: false }
      ]
    },
    {
      _tempId: 't3',
      title: 'Hire Wedding Photographer & Videographer',
      category: 'Photo & Video',
      start_date: subtractDays(wedding, 300),
      end_date: subtractDays(wedding, 250),
      is_milestone: false,
      status: 'todo',
      progress: 0,
      assignee: 'partner1',
      priority: 'high',
      notes: 'Review portfolios for candid documentary style.',
      dependencies: ['t2']
    },
    // 7 - 9 Months Before
    {
      _tempId: 't4',
      title: 'Catering Menu Tasting & Selection',
      category: 'Venue & Reception',
      start_date: subtractDays(wedding, 260),
      end_date: subtractDays(wedding, 220),
      is_milestone: false,
      status: 'todo',
      progress: 0,
      assignee: 'both',
      priority: 'high',
      notes: 'Select entrees, appetizers, and dietary restriction options.',
      dependencies: ['t2']
    },
    {
      _tempId: 't5',
      title: 'Design & Send Save The Dates',
      category: 'Stationery & Invitations',
      start_date: subtractDays(wedding, 250),
      end_date: subtractDays(wedding, 210),
      is_milestone: true,
      status: 'todo',
      progress: 0,
      assignee: 'partner2',
      priority: 'medium',
      notes: 'Order prints and send out to out-of-town and local guests.'
    },
    {
      _tempId: 't6',
      title: 'Wedding Attire Shopping (Dress / Suit / Tux)',
      category: 'Attire & Beauty',
      start_date: subtractDays(wedding, 240),
      end_date: subtractDays(wedding, 180),
      is_milestone: false,
      status: 'todo',
      progress: 0,
      assignee: 'both',
      priority: 'high',
      notes: 'Allows 4-6 months for tailoring and fittings.'
    },
    // 4 - 6 Months Before
    {
      _tempId: 't7',
      title: 'Book Florist & Floral Installations',
      category: 'Flowers & Decor',
      start_date: subtractDays(wedding, 180),
      end_date: subtractDays(wedding, 140),
      is_milestone: false,
      status: 'todo',
      progress: 0,
      assignee: 'partner1',
      priority: 'medium',
      notes: 'Bouquets, boutonnieres, centerpieces, and arch decor.'
    },
    {
      _tempId: 't8',
      title: 'Book DJ / Band & Sound Setup',
      category: 'Ceremony & Music',
      start_date: subtractDays(wedding, 170),
      end_date: subtractDays(wedding, 130),
      is_milestone: false,
      status: 'todo',
      progress: 0,
      assignee: 'partner2',
      priority: 'medium',
      notes: 'Finalize ceremony mic setup and reception dance playlist.'
    },
    {
      _tempId: 't9',
      title: 'Mail Formal Wedding Invitations',
      category: 'Stationery & Invitations',
      start_date: subtractDays(wedding, 110),
      end_date: subtractDays(wedding, 75),
      is_milestone: true,
      status: 'todo',
      progress: 0,
      assignee: 'both',
      priority: 'urgent',
      notes: 'Include RSVP deadline (4 weeks before wedding day).'
    },
    // 2 - 3 Months Before
    {
      _tempId: 't10',
      title: 'Order Wedding Cake & Dessert Bar',
      category: 'Venue & Reception',
      start_date: subtractDays(wedding, 85),
      end_date: subtractDays(wedding, 55),
      is_milestone: false,
      status: 'todo',
      progress: 0,
      assignee: 'partner2',
      priority: 'medium',
      notes: 'Tasting appointment & delivery coordination.'
    },
    {
      _tempId: 't11',
      title: 'Hair & Makeup Trial Run',
      category: 'Attire & Beauty',
      start_date: subtractDays(wedding, 70),
      end_date: subtractDays(wedding, 45),
      is_milestone: false,
      status: 'todo',
      progress: 0,
      assignee: 'partner1',
      priority: 'medium'
    },
    // 1 Month Before
    {
      _tempId: 't12',
      title: 'Obtain Marriage License',
      category: 'Logistics & Legal',
      start_date: subtractDays(wedding, 35),
      end_date: subtractDays(wedding, 20),
      is_milestone: true,
      status: 'todo',
      progress: 0,
      assignee: 'both',
      priority: 'urgent',
      notes: 'Check county clerk requirements and validity window.'
    },
    {
      _tempId: 't13',
      title: 'Final RSVP Count & Table Seating Chart',
      category: 'Venue & Reception',
      start_date: subtractDays(wedding, 25),
      end_date: subtractDays(wedding, 12),
      is_milestone: true,
      status: 'todo',
      progress: 0,
      assignee: 'both',
      priority: 'urgent',
      notes: 'Send final headcount to caterer and venue.'
    },
    // Week of & Big Day
    {
      _tempId: 't14',
      title: 'Rehearsal Dinner & Walkthrough',
      category: 'Ceremony & Music',
      start_date: subtractDays(wedding, 2),
      end_date: subtractDays(wedding, 1),
      is_milestone: true,
      status: 'todo',
      progress: 0,
      assignee: 'both',
      priority: 'high'
    },
    {
      _tempId: 't15',
      title: 'Our Wedding Day! 💍✨',
      category: 'Ceremony & Music',
      start_date: subtractDays(wedding, 0),
      end_date: subtractDays(wedding, 0),
      is_milestone: true,
      status: 'todo',
      progress: 0,
      assignee: 'both',
      priority: 'urgent',
      notes: 'Celebrate, soak up the love, and have the best time of our lives!'
    }
  ];
}
