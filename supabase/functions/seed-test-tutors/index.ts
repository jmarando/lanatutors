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

    for (const tutor of testTutors) {
      const email = `${tutor.name.toLowerCase().replace(' ', '.')}@testtutor.com`
      const password = 'TestPass123!'

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: tutor.name
        }
      })

      if (authError) {
        console.error(`Error creating user ${tutor.name}:`, authError)
        continue
      }

      const userId = authData.user.id

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

      // Create tutor profile
      const { error: tutorError } = await supabaseAdmin
        .from('tutor_profiles')
        .insert({
          user_id: userId,
          subjects: tutor.subjects,
          curriculum: tutor.curriculum,
          current_institution: tutor.school,
          hourly_rate: tutor.rate,
          experience_years: tutor.exp,
          bio: `Experienced ${tutor.subjects.join(' and ')} tutor with ${tutor.exp} years of teaching experience. Passionate about helping students achieve their academic goals.`,
          qualifications: [`Bachelor's Degree in Education`, `${tutor.subjects[0]} Specialist`],
          verified: true,
          rating: 4.0 + Math.random() * 1.0,
          total_reviews: Math.floor(Math.random() * 20)
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
