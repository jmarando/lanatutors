import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Starting fresh seed - deleting existing data...')
    
    // First, get all test tutor emails to delete auth users
    const testEmails = [
      'sarah.mwangi@testtutor.com', 'david.ochieng@testtutor.com', 'grace.wanjiru@testtutor.com',
      'peter.kamau@testtutor.com', 'mary.akinyi@testtutor.com', 'john.kariuki@testtutor.com',
      'faith.njeri@testtutor.com', 'michael.otieno@testtutor.com', 'lucy.wairimu@testtutor.com',
      'james.mutua@testtutor.com', 'elizabeth.chebet@testtutor.com', 'daniel.kipchoge@testtutor.com',
      'catherine.adhiambo@testtutor.com', 'robert.maina@testtutor.com', 'anne.wambui@testtutor.com',
      'joseph.kiprotich@testtutor.com', 'jane.nyambura@testtutor.com', 'patrick.owino@testtutor.com',
      'susan.njoki@testtutor.com', 'thomas.kiptoo@testtutor.com', 'rose.mumbua@testtutor.com',
      'george.omondi@testtutor.com', 'margaret.nyawira@testtutor.com', 'samuel.kuria@testtutor.com',
      'joyce.jepkoech@testtutor.com', 'anthony.njuguna@testtutor.com', 'mercy.awino@testtutor.com',
      'francis.githinji@testtutor.com', 'esther.chepkoech@testtutor.com', 'kevin.odongo@testtutor.com',
      'nancy.wangari@testtutor.com', 'vincent.koech@testtutor.com', 'beatrice.nduta@testtutor.com',
      'dennis.kiplagat@testtutor.com', 'christine.moraa@testtutor.com', 'brian.mulwa@testtutor.com',
      'phyllis.jepkemoi@testtutor.com', 'eric.ndirangu@testtutor.com', 'alice.atieno@testtutor.com',
      'martin.rotich@testtutor.com', 'violet.wanjiku@testtutor.com', 'charles.kemboi@testtutor.com',
      'priscilla.anyango@testtutor.com', 'stephen.kamande@testtutor.com', 'rebecca.chepkurui@testtutor.com',
      'wilson.onyango@testtutor.com', 'helen.waweru@testtutor.com', 'edwin.kimani@testtutor.com',
      'caroline.jelimo@testtutor.com', 'kenneth.macharia@testtutor.com'
    ]
    
    // Delete auth users (this will cascade to profiles, roles, etc.)
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers()
    if (allUsers?.users) {
      for (const user of allUsers.users) {
        if (user.email && testEmails.includes(user.email)) {
          await supabaseAdmin.auth.admin.deleteUser(user.id)
          console.log(`Deleted user: ${user.email}`)
        }
      }
    }
    
    // Delete any remaining data
    await supabaseAdmin.from('tutor_reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('tutor_availability').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('tutor_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    console.log('Existing data cleared. Creating 50 new tutors...')

    const testTutors = [
      { name: 'Sarah Mwangi', subjects: ['Mathematics', 'Physics'], school: 'University of Nairobi', curriculum: ['CBC', 'IGCSE'], rate: 800, exp: 5 },
      { name: 'David Ochieng', subjects: ['Chemistry', 'Biology'], school: 'Kenyatta University', curriculum: ['8-4-4', 'CBC'], rate: 750, exp: 7 },
      { name: 'Grace Wanjiru', subjects: ['English', 'Literature'], school: 'Strathmore University', curriculum: ['IGCSE', 'IB'], rate: 900, exp: 4 },
      { name: 'Peter Kamau', subjects: ['Mathematics', 'Computer Science'], school: 'JKUAT', curriculum: ['IB', 'CBC'], rate: 1000, exp: 8 },
      { name: 'Mary Akinyi', subjects: ['Kiswahili', 'CRE'], school: 'Moi University', curriculum: ['CBC', '8-4-4'], rate: 650, exp: 3 },
      { name: 'John Kariuki', subjects: ['History', 'Geography'], school: 'Egerton University', curriculum: ['8-4-4', 'CBC'], rate: 700, exp: 6 },
      { name: 'Faith Njeri', subjects: ['Business Studies', 'Economics'], school: 'Strathmore University', curriculum: ['IGCSE', 'IB'], rate: 850, exp: 5 },
      { name: 'Michael Otieno', subjects: ['Physics', 'Mathematics'], school: 'University of Nairobi', curriculum: ['CBC', 'IGCSE'], rate: 950, exp: 9 },
      { name: 'Lucy Wairimu', subjects: ['Biology', 'Chemistry'], school: 'Kenyatta University', curriculum: ['IB', 'CBC'], rate: 800, exp: 4 },
      { name: 'James Mutua', subjects: ['Mathematics', 'Physics'], school: 'JKUAT', curriculum: ['CBC', '8-4-4'], rate: 750, exp: 5 },
      { name: 'Elizabeth Chebet', subjects: ['English', 'Kiswahili'], school: 'Moi University', curriculum: ['8-4-4', 'CBC'], rate: 700, exp: 8 },
      { name: 'Daniel Kipchoge', subjects: ['Computer Science', 'Mathematics'], school: 'Strathmore University', curriculum: ['IGCSE', 'IB'], rate: 1100, exp: 6 },
      { name: 'Catherine Adhiambo', subjects: ['French', 'English'], school: 'University of Nairobi', curriculum: ['CBC', 'IGCSE'], rate: 900, exp: 5 },
      { name: 'Robert Maina', subjects: ['Economics', 'Business'], school: 'Kenyatta University', curriculum: ['IB', 'CBC'], rate: 850, exp: 10 },
      { name: 'Anne Wambui', subjects: ['Art', 'Design'], school: 'Egerton University', curriculum: ['CBC', 'IGCSE'], rate: 600, exp: 3 },
      { name: 'Joseph Kiprotich', subjects: ['Agriculture', 'Biology'], school: 'Moi University', curriculum: ['8-4-4', 'CBC'], rate: 650, exp: 7 },
      { name: 'Jane Nyambura', subjects: ['Music', 'Drama'], school: 'Kenyatta University', curriculum: ['IGCSE', 'IB'], rate: 700, exp: 4 },
      { name: 'Patrick Owino', subjects: ['Physical Education', 'Biology'], school: 'JKUAT', curriculum: ['CBC', '8-4-4'], rate: 600, exp: 5 },
      { name: 'Susan Njoki', subjects: ['Mathematics', 'Statistics'], school: 'Strathmore University', curriculum: ['IB', 'IGCSE'], rate: 1000, exp: 6 },
      { name: 'Thomas Kiptoo', subjects: ['Chemistry', 'Physics'], school: 'University of Nairobi', curriculum: ['CBC', 'IB'], rate: 900, exp: 8 },
      { name: 'Rose Mumbua', subjects: ['Geography', 'History'], school: 'Egerton University', curriculum: ['8-4-4', 'CBC'], rate: 650, exp: 4 },
      { name: 'George Omondi', subjects: ['Computer Science', 'ICT'], school: 'Strathmore University', curriculum: ['IGCSE', 'IB'], rate: 1050, exp: 7 },
      { name: 'Margaret Nyawira', subjects: ['Literature', 'English'], school: 'Kenyatta University', curriculum: ['CBC', 'IGCSE'], rate: 750, exp: 5 },
      { name: 'Samuel Kuria', subjects: ['Mathematics', 'Economics'], school: 'JKUAT', curriculum: ['IB', 'CBC'], rate: 900, exp: 6 },
      { name: 'Joyce Jepkoech', subjects: ['Biology', 'Agriculture'], school: 'Moi University', curriculum: ['CBC', '8-4-4'], rate: 700, exp: 4 },
      { name: 'Anthony Njuguna', subjects: ['Physics', 'Computer Science'], school: 'University of Nairobi', curriculum: ['8-4-4', 'IGCSE'], rate: 950, exp: 9 },
      { name: 'Mercy Awino', subjects: ['Kiswahili', 'English'], school: 'Kenyatta University', curriculum: ['IGCSE', 'CBC'], rate: 700, exp: 5 },
      { name: 'Francis Githinji', subjects: ['Business Studies', 'Mathematics'], school: 'Strathmore University', curriculum: ['CBC', 'IB'], rate: 850, exp: 6 },
      { name: 'Esther Chepkoech', subjects: ['Chemistry', 'Biology'], school: 'Egerton University', curriculum: ['IB', 'IGCSE'], rate: 800, exp: 4 },
      { name: 'Kevin Odongo', subjects: ['History', 'CRE'], school: 'Moi University', curriculum: ['CBC', '8-4-4'], rate: 650, exp: 7 },
      { name: 'Nancy Wangari', subjects: ['Mathematics', 'Physics'], school: 'JKUAT', curriculum: ['8-4-4', 'CBC'], rate: 750, exp: 5 },
      { name: 'Vincent Koech', subjects: ['English', 'Literature'], school: 'University of Nairobi', curriculum: ['IGCSE', 'IB'], rate: 900, exp: 8 },
      { name: 'Beatrice Nduta', subjects: ['Geography', 'Business'], school: 'Kenyatta University', curriculum: ['CBC', 'IGCSE'], rate: 700, exp: 4 },
      { name: 'Dennis Kiplagat', subjects: ['Computer Science', 'Mathematics'], school: 'Strathmore University', curriculum: ['IB', 'CBC'], rate: 1100, exp: 10 },
      { name: 'Christine Moraa', subjects: ['Biology', 'Chemistry'], school: 'Egerton University', curriculum: ['CBC', 'IGCSE'], rate: 750, exp: 5 },
      { name: 'Brian Mulwa', subjects: ['Economics', 'Mathematics'], school: 'JKUAT', curriculum: ['8-4-4', 'IB'], rate: 850, exp: 6 },
      { name: 'Phyllis Jepkemoi', subjects: ['French', 'English'], school: 'Moi University', curriculum: ['IGCSE', 'CBC'], rate: 800, exp: 4 },
      { name: 'Eric Ndirangu', subjects: ['Physics', 'Mathematics'], school: 'University of Nairobi', curriculum: ['CBC', 'IB'], rate: 950, exp: 8 },
      { name: 'Alice Atieno', subjects: ['Art', 'Music'], school: 'Kenyatta University', curriculum: ['IB', 'IGCSE'], rate: 650, exp: 3 },
      { name: 'Martin Rotich', subjects: ['Agriculture', 'Biology'], school: 'Egerton University', curriculum: ['CBC', '8-4-4'], rate: 700, exp: 7 },
      { name: 'Violet Wanjiku', subjects: ['English', 'Kiswahili'], school: 'Strathmore University', curriculum: ['8-4-4', 'CBC'], rate: 750, exp: 5 },
      { name: 'Charles Kemboi', subjects: ['Computer Science', 'ICT'], school: 'JKUAT', curriculum: ['IGCSE', 'IB'], rate: 1000, exp: 6 },
      { name: 'Priscilla Anyango', subjects: ['Mathematics', 'Statistics'], school: 'University of Nairobi', curriculum: ['CBC', 'IGCSE'], rate: 900, exp: 5 },
      { name: 'Stephen Kamande', subjects: ['Chemistry', 'Physics'], school: 'Kenyatta University', curriculum: ['IB', 'CBC'], rate: 850, exp: 9 },
      { name: 'Rebecca Chepkurui', subjects: ['History', 'Geography'], school: 'Moi University', curriculum: ['CBC', '8-4-4'], rate: 650, exp: 4 },
      { name: 'Wilson Onyango', subjects: ['Business Studies', 'Economics'], school: 'Strathmore University', curriculum: ['8-4-4', 'IGCSE'], rate: 800, exp: 8 },
      { name: 'Helen Waweru', subjects: ['Biology', 'Chemistry'], school: 'Egerton University', curriculum: ['IGCSE', 'IB'], rate: 750, exp: 5 },
      { name: 'Edwin Kimani', subjects: ['Mathematics', 'Computer Science'], school: 'JKUAT', curriculum: ['CBC', 'IB'], rate: 1000, exp: 7 },
      { name: 'Caroline Jelimo', subjects: ['English', 'Literature'], school: 'University of Nairobi', curriculum: ['IB', 'IGCSE'], rate: 850, exp: 6 },
      { name: 'Kenneth Macharia', subjects: ['Physics', 'Mathematics'], school: 'Kenyatta University', curriculum: ['CBC', 'IGCSE'], rate: 900, exp: 8 },
    ]

    const createdTutors = []
    let tutorIndex = 0

    for (const tutor of testTutors) {
      tutorIndex++
      // Make first 25 tutors verified, last 25 pending for testing
      const isVerified = tutorIndex <= 25
      const email = `${tutor.name.toLowerCase().replace(' ', '.')}@testtutor.com`
      const password = 'TestPass123!'

      let userId: string

      // Try to create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: tutor.name
        }
      })

      if (authError) {
        // If user already exists, get their ID
        if (authError.message.includes('already been registered')) {
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = existingUsers?.users.find(u => u.email === email)
          if (existingUser) {
            userId = existingUser.id
          } else {
            console.error(`Could not find existing user ${tutor.name}`)
            continue
          }
        } else {
          console.error(`Error creating user ${tutor.name}:`, authError)
          continue
        }
      } else {
        userId = authData.user.id
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          full_name: tutor.name,
          phone_number: `+2547${Math.floor(10000000 + Math.random() * 90000000)}`,
          age: 25 + Math.floor(Math.random() * 15),
          curriculum: tutor.curriculum[0]
        })

      if (profileError) {
        console.error(`Error creating profile for ${tutor.name}:`, profileError)
        continue
      }

      // Assign tutor role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'tutor'
        })

      if (roleError) {
        console.error(`Error assigning role to ${tutor.name}:`, roleError)
      }

      // Define services and teaching modes based on subjects
      const services = ['Extra Tuition', 'Exam Preparation', 'Homework Help'];
      const allServices = [...services];
      
      // Add subject-specific services
      if (tutor.subjects.includes('Mathematics') || tutor.subjects.includes('Physics')) {
        allServices.push('Problem-Solving Sessions', 'Revision Classes');
      }
      if (tutor.subjects.includes('English') || tutor.subjects.includes('Literature')) {
        allServices.push('Essay Writing Support', 'Reading Comprehension');
      }
      
      const selectedServices = allServices.slice(0, 3 + Math.floor(Math.random() * 2));
      const teachingModes = ['Online Sessions', 'In-Person', 'Home Visits'];
      const selectedModes = teachingModes.slice(0, 1 + Math.floor(Math.random() * 2));
      
      // Generate teaching experience timeline
      const institutions = [
        'Starehe Boys Centre', 'Alliance High School', 'Kenya High School',
        'Moi Girls School', 'Nairobi School', 'Brookhouse School',
        'St. Mary\'s School', 'Precious Blood', 'Loreto Convent'
      ];
      
      const teachingExperience = [];
      const numPositions = 1 + Math.floor(Math.random() * 2); // 1-2 positions
      for (let i = 0; i < numPositions; i++) {
        teachingExperience.push({
          institution: institutions[Math.floor(Math.random() * institutions.length)],
          years: 2 + Math.floor(Math.random() * 5), // 2-6 years
          role: `${tutor.subjects[0]} Teacher`
        });
      }

      const tutoringExperiences = [
        'Specialized in one-on-one tutoring for KCSE candidates, helping over 50 students improve their grades by at least 2 points.',
        'Provided personalized tutoring for IGCSE and A-Level students, focusing on exam preparation and concept mastery.',
        'Conducted group tutoring sessions for 8-4-4 curriculum students, with a 90% success rate in national examinations.',
        'Offered intensive crash courses for students preparing for university entrance exams with proven results.',
        'Mentored struggling students to achieve academic excellence through tailored learning strategies.'
      ];

      // Generate "Why Students Love" highlights
      const whyStudentsLoveOptions = [
        'Makes complex concepts simple and easy to understand',
        'Patient and understanding with struggling students',
        'Uses real-world examples to illustrate difficult topics',
        'Provides personalized attention and tailored study plans',
        'Always available for questions outside of scheduled sessions',
        'Creates a comfortable, judgment-free learning environment',
        'Excellent track record of improving student grades',
        'Engaging teaching style that keeps students motivated',
        'Flexible scheduling to accommodate busy student schedules',
        'Provides comprehensive notes and study materials',
        'Goes the extra mile to ensure student success',
        'Uses innovative teaching methods and technology'
      ];
      
      // Select 3-5 random highlights
      const shuffled = [...whyStudentsLoveOptions].sort(() => 0.5 - Math.random());
      const whyStudentsLove = shuffled.slice(0, 3 + Math.floor(Math.random() * 3));
      
      // Upsert tutor profile (update if exists, insert if not)
      const { error: tutorError } = await supabaseAdmin
        .from('tutor_profiles')
        .upsert({
          user_id: userId,
          subjects: tutor.subjects,
          curriculum: tutor.curriculum,
          current_institution: tutor.school,
          hourly_rate: tutor.rate,
          experience_years: tutor.exp,
          bio: `Experienced ${tutor.subjects.join(' and ')} tutor with ${tutor.exp} years of teaching experience. Passionate about helping students achieve their academic goals.`,
          qualifications: [`Bachelor's Degree in Education`, `${tutor.subjects[0]} Specialist`],
          rating: 4.0 + Math.random() * 1.0,
          total_reviews: Math.floor(Math.random() * 20),
          services_offered: selectedServices,
          specializations: `I specialize in ${tutor.subjects[0]} concepts including algebra, calculus, and problem-solving techniques. I focus on building strong foundations and exam strategies tailored to ${tutor.curriculum.join(' and ')} curricula.`,
          teaching_location: `${tutor.school} Area, Nairobi`,
          teaching_mode: selectedModes,
          graduation_year: 2010 + Math.floor(Math.random() * 12),
          teaching_experience: teachingExperience,
          tutoring_experience: tutoringExperiences[Math.floor(Math.random() * tutoringExperiences.length)],
          why_students_love: whyStudentsLove,
          verified: isVerified
        })

      if (tutorError) {
        console.error(`Error creating tutor profile for ${tutor.name}:`, tutorError)
        continue
      }

      createdTutors.push({ name: tutor.name, email })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully created ${createdTutors.length} test tutors`,
        tutors: createdTutors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
