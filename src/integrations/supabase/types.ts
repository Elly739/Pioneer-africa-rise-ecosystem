export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          context_label: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["ai_kind"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_label?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["ai_kind"]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_label?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["ai_kind"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          link: string | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          link?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          link?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          opportunity_id: string
          project_id: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          assignment_id: string
          created_at: string
          graded_at: string | null
          id: string
          response: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          assignment_id: string
          created_at?: string
          graded_at?: string | null
          id?: string
          response: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          assignment_id?: string
          created_at?: string
          graded_at?: string | null
          id?: string
          response?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "course_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          code: string
          description: string
          icon: string
          name: string
          sort_order: number
          tier: string
        }
        Insert: {
          code: string
          description: string
          icon?: string
          name: string
          sort_order?: number
          tier?: string
        }
        Update: {
          code?: string
          description?: string
          icon?: string
          name?: string
          sort_order?: number
          tier?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string
          body: string
          category: string
          cover_url: string | null
          created_at: string
          excerpt: string
          id: string
          published: boolean
          published_at: string
          read_minutes: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          body?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string
          read_minutes?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          body?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string
          read_minutes?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          code: string
          course_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          code: string
          course_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          code?: string
          course_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          created_at: string
          demo_url: string | null
          description: string
          file_url: string | null
          id: string
          repo_url: string | null
          submitted_by: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          demo_url?: string | null
          description?: string
          file_url?: string | null
          id?: string
          repo_url?: string | null
          submitted_by: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          demo_url?: string | null
          description?: string
          file_url?: string | null
          id?: string
          repo_url?: string | null
          submitted_by?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "challenge_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_team_members: {
        Row: {
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "challenge_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_teams: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          lead_user_id: string
          looking_for: string[]
          name: string
          pitch: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          lead_user_id: string
          looking_for?: string[]
          name: string
          pitch?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          lead_user_id?: string
          looking_for?: string[]
          name?: string
          pitch?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_teams_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          challenge_id: string
          created_at: string
          submission_id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          submission_id: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string
          deadline: string | null
          description: string
          id: string
          prize: string | null
          slug: string
          status: Database["public"]["Enums"]["challenge_status"]
          tags: string[]
          title: string
          updated_at: string
          winner_submission_id: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string
          id?: string
          prize?: string | null
          slug: string
          status?: Database["public"]["Enums"]["challenge_status"]
          tags?: string[]
          title: string
          updated_at?: string
          winner_submission_id?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string
          id?: string
          prize?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          winner_submission_id?: string | null
        }
        Relationships: []
      }
      coach_memory: {
        Row: {
          current_focus: string
          goals: string
          last_commitment: string
          last_session_at: string | null
          notes: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_focus?: string
          goals?: string
          last_commitment?: string
          last_session_at?: string | null
          notes?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_focus?: string
          goals?: string
          last_commitment?: string
          last_session_at?: string | null
          notes?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collaboration_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          project_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          project_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          project_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_assignments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          prompt: string
          rubric: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          prompt: string
          rubric?: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          prompt?: string
          rubric?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_cohorts: {
        Row: {
          capacity: number | null
          course_id: string
          created_at: string
          ends_on: string
          enroll_deadline: string | null
          id: string
          starts_on: string
          title: string
        }
        Insert: {
          capacity?: number | null
          course_id: string
          created_at?: string
          ends_on: string
          enroll_deadline?: string | null
          id?: string
          starts_on: string
          title: string
        }
        Update: {
          capacity?: number | null
          course_id?: string
          created_at?: string
          ends_on?: string
          enroll_deadline?: string | null
          id?: string
          starts_on?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_cohorts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["course_level"]
          slug: string
          subject_id: string | null
          summary: string | null
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          slug: string
          subject_id?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          slug?: string
          subject_id?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      cvs: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discussion_replies: {
        Row: {
          body: string
          created_at: string
          discussion_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          discussion_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          discussion_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      discussion_votes: {
        Row: {
          created_at: string
          discussion_id: string | null
          id: string
          reply_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_votes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "discussion_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          accepted_reply_id: string | null
          body: string
          created_at: string
          id: string
          is_office_hours: boolean
          office_hours_at: string | null
          title: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_reply_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_office_hours?: boolean
          office_hours_at?: string | null
          title: string
          topic?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_reply_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_office_hours?: boolean
          office_hours_at?: string | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_accepted_reply_id_fkey"
            columns: ["accepted_reply_id"]
            isOneToOne: false
            referencedRelation: "discussion_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          cohort_id: string | null
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          cohort_id?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cohort_id?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "course_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      learning_tasks: {
        Row: {
          created_at: string
          detail: string
          done: boolean
          due_date: string | null
          id: string
          source: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string
          done?: boolean
          due_date?: string | null
          id?: string
          source?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string
          done?: boolean
          due_date?: string | null
          id?: string
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string
          course_id: string
          created_at: string
          duration_min: number
          id: string
          order: number
          title: string
        }
        Insert: {
          content?: string
          course_id: string
          created_at?: string
          duration_min?: number
          id?: string
          order?: number
          title: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          apply_url: string | null
          created_at: string
          deadline: string | null
          description: string
          id: string
          location: string | null
          organization: string
          remote: boolean
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["opportunity_type"]
        }
        Insert: {
          apply_url?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          location?: string | null
          organization: string
          remote?: boolean
          tags?: string[]
          title: string
          type: Database["public"]["Enums"]["opportunity_type"]
        }
        Update: {
          apply_url?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          location?: string | null
          organization?: string
          remote?: boolean
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["opportunity_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          display_name: string | null
          github_url: string | null
          headline: string | null
          id: string
          interests: string[]
          linkedin_url: string | null
          onboarded_at: string | null
          open_to: string[]
          partner_verified: boolean
          primary_goal: string | null
          skill_level: string | null
          skills: string[]
          study_year: string | null
          talent_visible: boolean
          university: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          github_url?: string | null
          headline?: string | null
          id: string
          interests?: string[]
          linkedin_url?: string | null
          onboarded_at?: string | null
          open_to?: string[]
          partner_verified?: boolean
          primary_goal?: string | null
          skill_level?: string | null
          skills?: string[]
          study_year?: string | null
          talent_visible?: boolean
          university?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          github_url?: string | null
          headline?: string | null
          id?: string
          interests?: string[]
          linkedin_url?: string | null
          onboarded_at?: string | null
          open_to?: string[]
          partner_verified?: boolean
          primary_goal?: string | null
          skill_level?: string | null
          skills?: string[]
          study_year?: string | null
          talent_visible?: boolean
          university?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      project_likes: {
        Row: {
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          body: string
          created_at: string
          happened_on: string
          id: string
          project_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          happened_on?: string
          id?: string
          project_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          happened_on?: string
          id?: string
          project_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cover_url: string | null
          created_at: string
          demo_url: string | null
          description: string
          id: string
          looking_for_collaborators: boolean
          repo_url: string | null
          roles_needed: string[]
          slug: string
          status: Database["public"]["Enums"]["project_status"]
          summary: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          demo_url?: string | null
          description?: string
          id?: string
          looking_for_collaborators?: boolean
          repo_url?: string | null
          roles_needed?: string[]
          slug: string
          status?: Database["public"]["Enums"]["project_status"]
          summary?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          demo_url?: string | null
          description?: string
          id?: string
          looking_for_collaborators?: boolean
          repo_url?: string | null
          roles_needed?: string[]
          slug?: string
          status?: Database["public"]["Enums"]["project_status"]
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          id: string
          passed: boolean
          quiz_id: string
          score: number
          taken_at: string
          user_id: string
        }
        Insert: {
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          taken_at?: string
          user_id: string
        }
        Update: {
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_index: number
          explanation: string | null
          id: string
          options: Json
          order: number
          question: string
          quiz_id: string
        }
        Insert: {
          correct_index: number
          explanation?: string | null
          id?: string
          options: Json
          order?: number
          question: string
          quiz_id: string
        }
        Update: {
          correct_index?: number
          explanation?: string | null
          id?: string
          options?: Json
          order?: number
          question?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          passing_score: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          passing_score?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          passing_score?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_invites: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      role_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_opportunities: {
        Row: {
          created_at: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          slug: string
          title: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          slug: string
          title: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          slug?: string
          title?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_code: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_code: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          last_active: string | null
          level: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          last_active?: string | null
          level?: number
          streak_days?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          last_active?: string | null
          level?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      innovation_scores: {
        Row: {
          certificates_count: number | null
          community_contributions: number | null
          lessons_completed: number | null
          likes_received: number | null
          projects_count: number | null
          score: number | null
          submissions_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          avatar_url: string | null
          badge_count: number | null
          certificates_count: number | null
          country: string | null
          display_name: string | null
          headline: string | null
          level: number | null
          projects_count: number | null
          score: number | null
          university: string | null
          user_id: string | null
          xp: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_xp: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      fanout_announcement: {
        Args: { _announcement_id: string }
        Returns: number
      }
      grant_badge: {
        Args: { _code: string; _user_id: string }
        Returns: undefined
      }
      has_community_activity: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_talent: {
        Args: {
          _limit?: number
          _min_score?: number
          _open_to?: string
          _q?: string
          _skill?: string
        }
        Returns: {
          avatar_url: string
          country: string
          display_name: string
          headline: string
          interests: string[]
          open_to: string[]
          projects_count: number
          score: number
          skills: string[]
          study_year: string
          university: string
          user_id: string
        }[]
      }
      verify_certificate: {
        Args: { _code: string }
        Returns: {
          code: string
          course_title: string
          holder_name: string
          issued_at: string
        }[]
      }
    }
    Enums: {
      ai_kind: "mentor" | "advisor"
      app_role: "admin" | "student" | "moderator" | "teacher" | "partner"
      application_status:
        | "submitted"
        | "under_review"
        | "interview"
        | "offer"
        | "rejected"
        | "withdrawn"
      challenge_status: "draft" | "open" | "judging" | "closed"
      course_level: "fundamental" | "intermediate" | "advanced"
      notification_type:
        | "project_like"
        | "discussion_reply"
        | "application_status"
        | "system"
        | "collab_request"
        | "collab_response"
        | "talent_message"
      opportunity_type:
        | "internship"
        | "job"
        | "scholarship"
        | "hackathon"
        | "fellowship"
        | "grant"
        | "incubator"
      project_status: "idea" | "building" | "launched"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_kind: ["mentor", "advisor"],
      app_role: ["admin", "student", "moderator", "teacher", "partner"],
      application_status: [
        "submitted",
        "under_review",
        "interview",
        "offer",
        "rejected",
        "withdrawn",
      ],
      challenge_status: ["draft", "open", "judging", "closed"],
      course_level: ["fundamental", "intermediate", "advanced"],
      notification_type: [
        "project_like",
        "discussion_reply",
        "application_status",
        "system",
        "collab_request",
        "collab_response",
        "talent_message",
      ],
      opportunity_type: [
        "internship",
        "job",
        "scholarship",
        "hackathon",
        "fellowship",
        "grant",
        "incubator",
      ],
      project_status: ["idea", "building", "launched"],
    },
  },
} as const
