import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  props: { params: Promise<{ callupId: string }> }
) {
  try {
    const { callupId } = await props.params
    const supabase = createAdminClient()

    const { data: callup } = await supabase
      .from('match_callups')
      .select(`
        id,
        status,
        match:matches(
          title,
          opponent,
          match_date,
          match_time,
          location,
          category:categories(name)
        ),
        student:students(
          id,
          name,
          birth_date,
          photo_url,
          preferred_position,
          dominant_foot
        )
      `)
      .eq('id', callupId)
      .single()

    const rawStudent = callup?.student as any
    const studentObj = Array.isArray(rawStudent) ? rawStudent[0] : rawStudent
    const rawMatch = callup?.match as any
    const matchObj = Array.isArray(rawMatch) ? rawMatch[0] : rawMatch

    const studentName = (studentObj?.name || 'Atleta do Sport').trim()
    const photoUrl = studentObj?.photo_url
    const position = studentObj?.preferred_position || 'Atacante'
    const foot =
      studentObj?.dominant_foot === 'left'
        ? 'CANHOTO'
        : studentObj?.dominant_foot === 'ambidextrous'
        ? 'AMBIDESTRO'
        : 'DESTRO'

    const birthYear = studentObj?.birth_date ? studentObj.birth_date.slice(0, 4) : '2015'

    let posCode = 'ATA'
    let posFull = 'ATACANTE'
    const p = position.toLowerCase()
    if (p.includes('gol')) { posCode = 'GOL'; posFull = 'GOLEIRO' }
    else if (p.includes('ata') || p.includes('cen')) { posCode = 'ATA'; posFull = 'ATACANTE' }
    else if (p.includes('pon')) { posCode = 'PON'; posFull = 'PONTA' }
    else if (p.includes('zag')) { posCode = 'ZAG'; posFull = 'ZAGUEIRO' }
    else if (p.includes('lat')) { posCode = 'LAT'; posFull = 'LATERAL' }
    else if (p.includes('vol')) { posCode = 'VOL'; posFull = 'VOLANTE' }
    else if (p.includes('mei')) { posCode = 'MEI'; posFull = 'MEIO-CAMPO' }

    const opponent = matchObj?.opponent || 'Adversário'
    const matchDate = matchObj?.match_date
      ? matchObj.match_date.split('-').reverse().join('/')
      : ''
    const matchTime = matchObj?.match_time ? matchObj.match_time.slice(0, 5) : ''
    const rawLocation = matchObj?.location || 'CT Ilha do Retiro'
    const locationShort = rawLocation.length > 22 ? rawLocation.slice(0, 22) + '...' : rawLocation

    // Template oficial enviado pelo usuário
    const templatePath = path.resolve(process.cwd(), 'public', 'sport-convocacao-template.jpg')
    let templateDataUrl = ''
    if (fs.existsSync(templatePath)) {
      const b64 = fs.readFileSync(templatePath).toString('base64')
      templateDataUrl = `data:image/jpeg;base64,${b64}`
    }

    // Mascote do Leão de fallback caso o aluno não tenha foto
    const mascotPath = path.resolve(process.cwd(), 'public', 'sport-lion-mascot.jpg')
    let mascotDataUrl = ''
    if (fs.existsSync(mascotPath)) {
      const mb64 = fs.readFileSync(mascotPath).toString('base64')
      mascotDataUrl = `data:image/jpeg;base64,${mb64}`
    }

    const athleteImage = photoUrl || mascotDataUrl

    return new ImageResponse(
      (
        <div
          style={{
            height: '1024px',
            width: '576px',
            display: 'flex',
            position: 'relative',
            backgroundColor: '#070709',
            fontFamily: 'sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Imagem Base de Convocação do Sport Club do Recife */}
          {templateDataUrl && (
            <img
              src={templateDataUrl}
              alt="Convocação Base"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '576px',
                height: '1024px',
                objectFit: 'cover',
              }}
            />
          )}

          {/* 1. Foto do Jogador Convocado (perfeitamente encaixada na moldura dourada) */}
          <div
            style={{
              position: 'absolute',
              top: '337px',
              left: '47px',
              width: '202px',
              height: '319px',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0A0A0C',
            }}
          >
            {athleteImage ? (
              <img
                src={athleteImage}
                alt={studentName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '48px', fontWeight: 900, color: '#FFE300' }}>SCR</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF' }}>LEÃO DA ILHA</span>
              </div>
            )}
          </div>

          {/* 2. Campo: NOME DO ALUNO */}
          <div
            style={{
              position: 'absolute',
              top: '372px',
              left: '278px',
              width: '254px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '14px',
              paddingRight: '8px',
            }}
          >
            <span
              style={{
                fontSize: studentName.length > 20 ? '13px' : '15px',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {studentName}
            </span>
          </div>

          {/* 3. Campo: PÉ */}
          <div
            style={{
              position: 'absolute',
              top: '453px',
              left: '278px',
              width: '254px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '14px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#FFE300',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {foot}
            </span>
          </div>

          {/* 4. Campo: ANO DE NASCIMENTO */}
          <div
            style={{
              position: 'absolute',
              top: '534px',
              left: '278px',
              width: '254px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '14px',
            }}
          >
            <span
              style={{
                fontSize: '15px',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '1px',
              }}
            >
              {birthYear}
            </span>
          </div>

          {/* 5. Campo: POSIÇÃO */}
          <div
            style={{
              position: 'absolute',
              top: '615px',
              left: '278px',
              width: '254px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '14px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#FFE300',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {posFull} ({posCode})
            </span>
          </div>

          {/* 6. Nome do Adversário (sob o escudo adversário) */}
          <div
            style={{
              position: 'absolute',
              top: '792px',
              left: '316px',
              width: '168px',
              minHeight: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0A0A0C',
              borderRadius: '4px',
              padding: '2px 4px',
            }}
          >
            <span
              style={{
                fontSize: opponent.length > 18 ? '9px' : opponent.length > 12 ? '11px' : '12px',
                fontWeight: 900,
                color: '#FFE300',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              {opponent}
            </span>
          </div>

          {/* 7. Data da Partida (ao lado do ícone de calendário) */}
          <div
            style={{
              position: 'absolute',
              top: '838px',
              left: '155px',
              width: '120px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}
            >
              {matchDate} {matchTime ? `às ${matchTime}` : ''}
            </span>
          </div>

          {/* 8. Local da Partida (ao lado do ícone de localização) */}
          <div
            style={{
              position: 'absolute',
              top: '838px',
              left: '320px',
              width: '155px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {locationShort}
            </span>
          </div>
        </div>
      ),
      {
        width: 576,
        height: 1024,
      }
    )
  } catch (err: any) {
    return new Response(`Erro ao gerar convocação: ${err.message}`, { status: 500 })
  }
}
