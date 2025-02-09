import { createServerSupabaseClient } from '../../supabase/server'
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get analysis ID from request
    const { analysisId } = await request.json()
    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      )
    }

    // Get analysis record
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (fetchError || !analysis) {
      console.error('Error fetching analysis:', fetchError)
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }

    // Run the Python analysis script with full analysis
    const pythonProcess = spawn('python', [
      path.join(process.cwd(), 'resume_matcher', 'scripts', 'processor.py'),
      '--resume', analysis.resume_url,
      '--job-description', analysis.job_description_url,
      '--extract-entities',
      '--extract-keywords',
      '--analyze-experience',
      '--full-analysis'
    ])

    let result = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python process error:', error)
          reject(new Error('Analysis failed'))
        } else {
          resolve(result)
        }
      })
    })

    // Parse the comprehensive results
    let analysisResults;
    try {
      analysisResults = JSON.parse(result);
    } catch (e) {
      console.error('Failed to parse analysis results:', e);
      throw new Error('Invalid analysis results format');
    }

    // Update the analysis record with comprehensive results
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        status: 'completed',
        results: {
          score: analysisResults.score,
          keyTerms: analysisResults.extracted_keywords,
          entities: analysisResults.extracted_entities,
          experience: analysisResults.experience_analysis,
          contactInfo: analysisResults.contact_information,
          skills: analysisResults.skills_analysis,
          recommendations: analysisResults.improvement_suggestions,
          details: analysisResults.detailed_analysis
        }
      })
      .eq('id', analysisId)

    if (updateError) {
      console.error('Error updating analysis:', updateError)
      throw new Error('Failed to update analysis results')
    }

    return NextResponse.json({
      success: true,
      message: 'Analysis completed successfully',
      score: analysisResults.score,
      results: {
        keyTerms: analysisResults.extracted_keywords,
        entities: analysisResults.extracted_entities,
        experience: analysisResults.experience_analysis,
        contactInfo: analysisResults.contact_information,
        skills: analysisResults.skills_analysis,
        recommendations: analysisResults.improvement_suggestions,
        details: analysisResults.detailed_analysis
      }
    })

  } catch (error: any) {
    console.error('Error processing analysis:', error)
    
    try {
      // Update analysis status to failed
      if (request.body) {
        const { analysisId } = await request.json()
        if (analysisId) {
          await supabase
            .from('analyses')
            .update({
              status: 'failed',
              results: {
                error: error.message
              }
            })
            .eq('id', analysisId)
        }
      }
    } catch (updateError) {
      console.error('Failed to update analysis status:', updateError)
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process analysis' },
      { status: 500 }
    )
  }
}
