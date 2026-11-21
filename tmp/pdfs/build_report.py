from pathlib import Path
import re, html, json, subprocess, textwrap, copy
from reportlab.pdfgen import canvas
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether, Image, Flowable)
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from pypdf import PdfReader
from PIL import Image as PILImage

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/Event_Planner_Deliverable_1.pdf'
TMP=ROOT/'tmp/pdfs'
OUT.parent.mkdir(parents=True,exist_ok=True)
REL='3f60d7ce26c4a93321fafcec4e18493e36fda21c'
CAND='bc8b6ba8457dd51211ea93e68ef6d6c2ab803dd4'
REPO='https://github.com/Tell52/SE_GPRJ3'
W,H=A4
M=43
CW=W-2*M
NAV={}
SECTIONS={}
BLUE=colors.HexColor('#183C55')
TEAL=colors.HexColor('#087F8C')
INK=colors.HexColor('#243746')
LIGHT=colors.HexColor('#EEF4F7')
GREY=colors.HexColor('#607484')
for name,file in [('Arial','arial.ttf'),('Arial-Bold','arialbd.ttf'),('Arial-Italic','ariali.ttf'),('Arial-BoldItalic','arialbi.ttf'),('Consolas','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(Path('C:/Windows/Fonts')/file)))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='Arial-Bold',italic='Arial-Italic',boldItalic='Arial-BoldItalic')
S={
 'body':ParagraphStyle('body',fontName='Arial',fontSize=10,leading=14,textColor=INK,spaceAfter=7,splitLongWords=True),
 'small':ParagraphStyle('small',fontName='Arial',fontSize=8.6,leading=11.5,textColor=INK,spaceAfter=5,splitLongWords=True),
 'cell':ParagraphStyle('cell',fontName='Arial',fontSize=8.7,leading=11.7,textColor=INK,spaceAfter=0,splitLongWords=True),
 'headcell':ParagraphStyle('headcell',fontName='Arial-Bold',fontSize=8.8,leading=11.7,textColor=colors.white),
 'h1':ParagraphStyle('h1',fontName='Arial-Bold',fontSize=25,leading=30,textColor=BLUE,spaceAfter=17,keepWithNext=True),
 'h2':ParagraphStyle('h2',fontName='Arial-Bold',fontSize=15,leading=19,textColor=BLUE,spaceBefore=13,spaceAfter=8,keepWithNext=True),
 'h3':ParagraphStyle('h3',fontName='Arial-Bold',fontSize=11.5,leading=15,textColor=TEAL,spaceBefore=10,spaceAfter=6,keepWithNext=True),
 'code':ParagraphStyle('code',fontName='Consolas',fontSize=8.1,leading=10.7,textColor=INK,backColor=LIGHT,borderPadding=8,spaceBefore=5,spaceAfter=10),
 'caption':ParagraphStyle('caption',fontName='Arial',fontSize=9,leading=12,textColor=GREY,spaceAfter=8),
}

def norm(t):
    return t.replace('\u2013','-').replace('\u2014',' - ').replace('\u2011','-').replace('\u2265','>=').replace('\u2264','<=').replace('\u2192','->').replace('\u00d7','x').replace('\u201c','"').replace('\u201d','"').replace('\u2019',"'").replace('\u2018',"'")

def inline(t):
    t=norm(t)
    # Source templates are rendered as explicit unavailable evidence, never as blank form fields.
    if re.fullmatch(r'`?<[^>]+>`?',t.strip()):
        t='Not recorded' if 'pending' not in t else 'Pending in source record'
    tokens=[]
    def save(s):
        tokens.append(s);return f'ZZTOKEN{len(tokens)-1}ZZ'
    def link(m):
        label,url=m.groups()
        if url.startswith('http'):
            return save(f'<link href="{html.escape(url,quote=True)}" color="#087F8C">{html.escape(norm(label))}</link>')
        targets={'srs.md':'Part A','features.md':'Part B','traceability.md':'Part B','system-sds.md':'Part C','plan.md':'Part D','specification.md':'Part E','api-spec.md':'Part E','ui-spec.md':'Part E','tests.md':'Parts E and F','reviewer.md':'Part F','ai-use.md':'Part F'}
        dest=targets.get(url.split('/')[-1])
        return save(html.escape(dest if dest else norm(label)))
    t=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,t)
    t=re.sub(r'`([^`]+)`',lambda m:save('<font name="Consolas" size="8.3">'+html.escape(m.group(1))+'</font>'),t)
    t=html.escape(t)
    t=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',t)
    for i,x in enumerate(tokens):t=t.replace(f'ZZTOKEN{i}ZZ',x)
    return t

def p(t,style='body'):return Paragraph(inline(t),S[style])
def code(t):
    lines=[]
    for l in norm(t).splitlines():
        lines.extend(textwrap.wrap(l,width=93,replace_whitespace=False,drop_whitespace=False,break_long_words=True,break_on_hyphens=False) or [' '])
    return KeepTogether([Paragraph('<br/>'.join(html.escape(x).replace(' ','&#160;') for x in lines),S['code'])])

def table(headers,rows,widths=None):
    if not widths:
        n=len(headers)
        # Favor the long narrative column and keep stable IDs readable.
        if n==2: widths=[CW*.26,CW*.74]
        elif n==3: widths=[CW*.23,CW*.36,CW*.41]
        elif n==4: widths=[CW*.13,CW*.55,CW*.15,CW*.17] if headers[0]=='ID' else [CW/n]*n
        elif n==5: widths=[CW*.16,CW*.24,CW*.14,CW*.20,CW*.26]
        else: widths=[CW/n]*n
    data=[[Paragraph(inline(x),S['headcell']) for x in headers]]
    data.extend([[p(x,'cell') for x in row] for row in rows])
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),BLUE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,LIGHT]),('LINEBELOW',(0,0),(-1,0),.5,TEAL),('LINEBELOW',(0,1),(-1,-1),.25,colors.HexColor('#DAE4EA'))]))
    return t

class Anchor(Flowable):
    def __init__(self,key):Flowable.__init__(self);self.key=key;self.width=0;self.height=0
    def draw(self):
        SECTIONS[self.key]=self.canv.getPageNumber()
        self.canv.bookmarkPage(self.key)
        self.canv.addOutlineEntry(self.key+' - '+PART_TITLES[self.key],self.key,level=0)

PART_TITLES={'A':'SRS and Product Scope','B':'Feature Inventory and Traceability','C':'System-Level SDS','D':'Three-Sprint Plan','E':'Sprint 1 Engineering Contracts','F':'Working Sprint 1 and Verification'}
story=[]
def part(k):
    story.extend([PageBreak(),Anchor(k),p('PART '+k,'h3'),p(PART_TITLES[k],'h1')])
def heading(t,level=2):story.append(p(t,'h'+str(level)))
def para(t):story.append(p(t))
def source(path):story.append(p('Source: '+path+' at release '+REL[:7]+'.','caption'))
def read(path):return subprocess.check_output(['git','show',REL+':'+path],cwd=ROOT).decode('utf-8')

def architecture():
    d=Drawing(CW,126)
    xs=[0,180,360]
    labels=[('BROWSER','React 18 / TypeScript','Forms and navigation'),('APPLICATION API','Express / TypeScript','Identity, rules, transactions'),('DATABASE','PostgreSQL 16 / Prisma','Durable rows and constraints')]
    for x,(a,b,c) in zip(xs,labels):
        d.add(Rect(x,30,148,77,rx=6,fillColor=LIGHT,strokeColor=TEAL,strokeWidth=.8))
        d.add(String(x+9,87,a,fontName='Arial-Bold',fontSize=9,fillColor=BLUE))
        d.add(String(x+9,67,b,fontName='Arial',fontSize=8.5,fillColor=INK))
        d.add(String(x+9,49,c,fontName='Arial',fontSize=7.8,fillColor=INK))
    for x,label in [(148,'JSON / HTTP'),(328,'Prisma')]:
        d.add(Line(x+3,69,x+29,69,strokeColor=TEAL))
        d.add(Polygon([x+29,69,x+24,72,x+24,66],fillColor=TEAL,strokeColor=TEAL))
        d.add(String(x+15,117,label,fontName='Arial',fontSize=8,fillColor=GREY,textAnchor='middle'))
    d.add(String(0,8,'Session cookie + CSRF header; the API enforces authorization before database access.',fontName='Arial',fontSize=9,fillColor=INK))
    return d

def erdiagram():
    d=Drawing(CW,150)
    for x,y,title,sub in [(0,90,'User','id PK / email unique / role'),(310,90,'Session','userId FK / tokenHash unique'),(0,5,'Event','organizerId FK -> User'),(310,5,'Registration','eventId FK / participantId FK')]:
        d.add(Rect(x,y,195,53,rx=5,fillColor=LIGHT,strokeColor=TEAL))
        d.add(String(x+10,y+33,title,fontName='Arial-Bold',fontSize=11,fillColor=BLUE))
        d.add(String(x+10,y+13,sub,fontName='Arial',fontSize=9,fillColor=INK))
    for a,b,c,e,label,lx,ly in [(195,118,310,118,'1 to many',252,126),(97,90,97,58,'1 to many',129,72),(195,30,310,30,'1 to many',252,39),(195,95,310,52,'holder: 1 to many',258,83)]:
        d.add(Line(a,b,c,e,strokeColor=TEAL,strokeWidth=1))
        d.add(String(lx,ly,label,fontName='Arial',fontSize=8,fillColor=GREY,textAnchor='middle'))
    return d

def mermaid(t):
    if 'flowchart' in t:story.append(architecture())
    elif 'erDiagram' in t:
        story.append(erdiagram())
        for name,body in re.findall(r'^\s+(User|Session|Event|Registration) \{(.*?)\n\s+\}',t,re.S|re.M):
            heading(name+' fields',3)
            rows=[]
            for l in body.strip().splitlines():
                q=l.strip().split(None,2)
                rows.append([q[1],q[0],q[2] if len(q)>2 else '-'])
            story.append(table(['Field','Type','Constraint / meaning'],rows,[CW*.28,CW*.18,CW*.54]));story.append(Spacer(1,8))
    else:story.append(code(t))

def md(t,skip_title=True):
    lines=t.splitlines();i=0
    while i<len(lines):
        l=lines[i].strip()
        if not l:i+=1;continue
        if l.startswith('```'):
            lang=l[3:];a=[];i+=1
            while i<len(lines) and not lines[i].strip().startswith('```'):a.append(lines[i]);i+=1
            if lang=='mermaid':mermaid('\n'.join(a))
            else:story.append(code('\n'.join(a)))
            i+=1;continue
        if l.startswith('|'):
            data=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                # Do not split pipe characters inside inline code or enum types.
                row=re.split(r'(?<!\\)\|(?=(?:[^`]*`[^`]*`)*[^`]*$)',lines[i].strip()[1:-1])
                data.append([x.strip().replace('\\|','|') for x in row]);i+=1
            headers=data[0];rows=[r for r in data[1:] if not all(re.fullmatch(r'[:\- ]+',x) for x in r)]
            maxcols=max([len(headers)]+[len(r) for r in rows])
            while len(headers)<maxcols:headers.append('Review status' if len(headers)==3 and headers[:2]==['Version','Date'] else 'Additional note')
            rows=[r+['']*(len(headers)-len(r)) for r in rows]
            if len(headers)>=6:
                # Wide engineering matrices become full-width records with every field retained.
                for r in rows:
                    label=r[0]+' | '+r[1] if len(r)>1 else r[0]
                    story.append(p(label,'h3'))
                    for j in range(2,len(headers)):
                        if j<len(r) and r[j]:story.append(p('**'+headers[j]+':** '+r[j],'small'))
                    story.append(Spacer(1,5))
            else:story.append(table(headers,rows));story.append(Spacer(1,9))
            continue
        h=re.match(r'^(#{1,6}) (.+)',l)
        if h:
            if len(h[1])==1 and skip_title:i+=1;continue
            heading(h[2],2 if len(h[1])<=2 else 3);i+=1;continue
        if re.match(r'^\s*(\d+\.|[-*]) ',lines[i]):
            line=re.sub(r'^\s*[-*] ','- ',lines[i].strip())
            story.append(p(line));i+=1;continue
        a=[l];i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r'^(#|\||```|\s*\d+\. |\s*[-*] )',lines[i]):a.append(lines[i].strip());i+=1
        para(' '.join(a))

def shot(path,title,caption,maxh=292):
    heading(title,3)
    im=PILImage.open(ROOT/path)
    image_path=ROOT/path
    if '/journey/desktop/' in path:
        # Crop only outer browser whitespace; preserve every pixel of the application card.
        grey=im.convert('L').crop((244,90,1196,im.height))
        bounds=grey.point(lambda a:255 if a<115 else 0).getbbox()
        bottom=min(im.height,90+bounds[3]+38) if bounds else im.height
        im=im.crop((244,90,1196,bottom))
        image_path=TMP/('crop-'+Path(path).name)
        im.save(image_path)
        caption+=' Image cropped to the application content for legibility.'
    iw,ih=im.size
    scale=min(CW/iw,maxh/ih)
    img=Image(str(image_path),width=iw*scale,height=ih*scale)
    img.hAlign='LEFT'
    story.extend([img,Spacer(1,5),p(caption,'caption')])

class Report(BaseDocTemplate):
    def __init__(self,path):
        BaseDocTemplate.__init__(self,str(path),pagesize=A4,leftMargin=M,rightMargin=M,topMargin=51,bottomMargin=48,title='Event Planner - Project Deliverable 1',author='Chutipon Homsuwan; Napat Tantipibulsap')
        self.addPageTemplates(PageTemplate(id='normal',frames=Frame(M,48,CW,H-99,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0),onPage=self.decorate))
    def decorate(self,c,doc):
        page=doc.page
        c.setStrokeColor(colors.HexColor('#D7E4EB'));c.line(M,H-34,W-M,H-34)
        c.setFont('Arial-Bold',8);c.setFillColor(BLUE);c.drawString(M,H-26,'EVENT PLANNER')
        c.setFont('Arial',8);c.setFillColor(GREY);c.drawRightString(W-M,H-26,'CPE 334 | Deliverable 1')
        c.line(M,35,W-M,35);c.setFont('Arial',8);c.drawString(M,22,'Sprint 1 | Release '+REL[:7]);c.drawRightString(W-M,22,str(page))

def build():
    global story
    story=[]
    story.extend([Spacer(1,56),p('CPE 334 / SEMESTER 1, 2026','h3'),p('Event Planner','h1'),p('Project Deliverable 1','h2'),p('Engineering baseline and working Sprint 1','h2'),Spacer(1,28)])
    story.append(table(['Team member','Student ID / GitHub'],[['Chutipon Homsuwan','67070503463 / JeenoXD'],['Napat Tantipibulsap','67070503411 / Tell52']],[CW*.50,CW*.50]))
    story.append(Spacer(1,22))
    para('**Theme 3:** Event Registration and Attendance System')
    para('**Context:** Faculty workshops and university student-club events')
    para('**Repository:** ['+REPO+']('+REPO+')')
    para('**Submitted release:** `'+REL+'`')
    para('**Release record:** PR #17, `sprint1` -> `main`, merged 8 November 2026 at 12:00:14 (Asia/Bangkok).')
    para('**Report compiled:** 12 November 2026 (Asia/Bangkok)')
    story.append(Spacer(1,18))
    para('This report contains the full product engineering baseline, Sprint 1 contracts and selected execution evidence. The report covers Sprint 1 Issues #1-8. Later laboratory issue backlogs are excluded.')
    story.append(PageBreak())
    heading('Contents and assessment navigation')
    rows=[]
    ids={'A':'FR-01-12; BR-01-12; NFR-01-07; DEC-01-13','B':'F-01-10; SYS-FOUND; SYS-UI; SYS-PERF','C':'Architecture, data, API, permissions, sessions','D':'Sprints 1-3; Issues #1-8','E':'F-01-04; AC-01-19; T-01-19; M-01/02; DoD','F':'Execution, demonstrations, TDD, reviews, release'}
    for n,k in enumerate(PART_TITLES):
        start=NAV.get(k,'-');end=(NAV.get(chr(ord(k)+1),0)-1) if k!='F' and NAV.get(chr(ord(k)+1)) else NAV.get('end','-')
        rows.append([k+' / '+PART_TITLES[k],f'{start}-{end}',ids[k]])
    story.append(table(['Part','Pages','Relevant IDs / content'],rows,[CW*.39,CW*.12,CW*.49]))
    heading('Reading the evidence',2)
    para('Parts A-D describe the whole product; Part E specifies the Sprint 1 increment. Part F contains the associated results and evidence. Source filenames are retained for traceability; the substantive engineering content is reproduced in this report.')
    para('The recorded test runs and screenshots belong to staging candidate `'+CAND+'`. Git comparison confirms no changes to application source, tests, dependencies, migrations or configuration between that candidate and release `'+REL[:7]+'`; only documentation and evidence were added. These are historical candidate runs, not newly executed tests on the main merge commit.')
    para('A release reconciliation in Part F supersedes older statements that PR #17 was pending. Historical review gaps and unconfirmed decision statuses remain visible. Nothing in this report invents a review, a board capture or a student-run manual check.')
    for k,files in [('A',['docs/srs.md']),('B',['docs/features.md','docs/traceability.md']),('C',['docs/system-sds.md']),('D',['docs/sprints/plan.md']),('E',['docs/sprints/sprint-1/specification.md','docs/sprints/sprint-1/api-spec.md','docs/sprints/sprint-1/ui-spec.md'])]:
        part(k)
        for path in files:
            if len(files)>1:heading(read(path).splitlines()[0].lstrip('# '))
            source(path)
            content=read(path)
            if path.endswith('srs.md'):
                # Remove empty review templates, retaining their lack of recorded approval explicitly.
                content=re.sub(r'### Decision review record.*?(?=## Version history)','### Decision review record\n\nNo completed decision-review rows are recorded in the source. The decision statuses above are retained; PR approval alone does not establish acceptance of every decision.\n\n',content,flags=re.S)
            md(content)
        if k=='E':
            heading('Software Test Specification (STS)')
            source('docs/sprints/sprint-1/tests.md')
            ts=read('docs/sprints/sprint-1/tests.md')
            md(ts.split('## Execution Results')[0])
            heading('Test specification version history')
            md(ts.split('## Version history')[1])
    build_f()
    Report(OUT).build(story)
    NAV.update(SECTIONS)
    NAV['end']=len(PdfReader(OUT).pages)

def build_f():
    part('F')
    heading('F.1 Release and verification summary')
    para('The assessed increment supports Organizer login -> create and publish -> Participant login and registration -> saved receipt and My registrations -> owner-only roster -> retrieval after API restart. The application uses real PostgreSQL persistence and backend identity, role and ownership enforcement.')
    story.append(table(['Item','Verified record'],[
      ['Release commit',REL],['Release PR','[PR #17]('+REPO+'/pull/17), sprint1 -> main; author Tell52; approved by JeenoXD at 12:00:04 and merged at 12:00:14 on 8 November 2026 (Asia/Bangkok).'],
      ['Release review comment','"very good job na bro" (APPROVED). A teammate approval exists; the comment contains no specific technical check.'],
      ['Issue #8','Closed as completed on GitHub on 8 November 2026 at 12:00:15 (Asia/Bangkok). This status does not by itself prove every evidence requirement.'],
      ['Tested candidate',CAND+'; execution on 8 November 2026, with historical feature results retained.'],
      ['Candidate / release comparison','git diff --name-only '+CAND[:7]+' '+REL[:7]+': 64 changed files, all under docs/. No client/, server/, e2e/, package lock or application configuration changes.'],
      ['Evidence boundary','Candidate results are applicable to unchanged code; no separate post-merge main build/test run is present in the repository evidence.'],
      ['Final project board','No final board screenshot or column export is available. Issue closure is reported separately from board state.']]))
    heading('F.2 Build, tests and actual execution output')
    para('The fresh-clone verification used a new remote clone of the staging candidate, Node 22.17.1, npm 10.9.2, Docker Engine 29.2.1 and installed Google Chrome. A separate Compose project and loopback ports 5543/5544 isolated its databases. All command exits were 0. The run took 180.779 seconds with prerequisites and caches already available; prerequisite installation and cold downloads were not measured.')
    story.append(table(['Command / suite','Passed','Failed','Skipped','Result'],[
      ['npm run build','n/a','0','n/a','API TypeScript + Prisma; client TypeScript + Vite succeeded'],['npm test / server','100','0','0','10 test files'],['npm test / client','46','0','0','4 test files'],['npm run test:e2e','2','0','0','Desktop 1440x900; mobile 390x844']],[CW*.40,CW*.10,CW*.10,CW*.10,CW*.30]))
    para('The following excerpts reproduce selected lines of the recorded output. Omitted setup and timing lines do not change the reported results.')
    for path,label in [('docs/evidence/sprint-1/issue8/m01-npm.cmd-run-build.txt','Production build'),('docs/evidence/sprint-1/issue8/m01-npm.cmd-test.txt','Server and client regression'),('docs/evidence/sprint-1/issue8/m01-npm.cmd-run-test-e2e.txt','Browser journeys')]:
        heading(label,3);source(path)
        txt=read(path)
        if 'build.txt' in path:txt='\n'.join(l for l in txt.splitlines() if any(q in l for q in ['> ','Generated Prisma','vite v','modules transformed','dist/','built in']))
        elif 'e2e' in path:txt='\n'.join(l for l in txt.splitlines() if any(q in l for q in ['Running 2','ok 1','ok 2','2 passed']))
        else:txt='\n'.join(l for l in txt.splitlines() if any(q in l for q in ['workspace','Test Files','Tests ','Duration']))
        story.append(code(txt.replace('\u2714','OK').replace('\u2713','OK')))
    heading('F.3 AC-to-test execution results')
    ts=read('docs/sprints/sprint-1/tests.md')
    ac=ts.split('### AC results')[1].split('## Evidence Index')[0]
    md(ac)
    heading('F.4 Program demonstrations')
    para('Demonstration set: candidate '+CAND[:7]+', the unchanged application later included in release '+REL[:7]+'. Screenshots are from the real API/PostgreSQL E2E run. For each scenario, the caption gives the roles, starting state, actions, expected result and recorded actual result. These screenshots are repository evidence from 8 November, not a new live session.')
    base='docs/evidence/sprint-1/issue8/journey/'
    shots=[
      ('desktop/01-create-form.png','1. Organizer creates a capacity-one event | F-02 / AC-05','Role: Organizer One. Start: authenticated, no journey event. Action: enter valid event details with capacity 1 and save. Expected: a persisted DRAFT owned by the session user. Actual: the journey saved the draft and proceeded to publish.'),
      ('desktop/02-published.png','2. Publication | F-02 / AC-05, AC-07','Role: owning Organizer. Start: saved draft. Action: confirm Publish. Expected: PUBLISHED state and discovery visibility. Actual: published detail and capacity are displayed; the later participant journey discovers the event.'),
      ('desktop/03-receipt.png','3. Registration receipt | F-03 / AC-10, AC-15','Role: Participant One. Start: published future event, one free place. Action: Register. Expected: one committed ACTIVE registration and a receipt. Actual: saved receipt shows registration identity and event details.'),
      ('desktop/04-my-registrations.png','4. Retrieve saved registration | F-03 / AC-15','Role: Participant One. Start: registration committed. Action: open My registrations. Expected: own saved row appears. Actual: the event registration is listed; opening it retrieves the same registration receipt.'),
      ('desktop/05-duplicate.png','5. Duplicate registration rejection | F-03 / AC-11','Role: Participant One. Start: another tab was opened before registration. Action: submit Register in that stale tab after a successful registration. Expected: ALREADY_REGISTERED and no second ACTIVE row. Actual: duplicate message is shown and the refreshed page marks the user registered.'),
      ('desktop/06-full-message.png','6. Last-place rejection | F-03 / AC-12','Role: Participant Two. Start: event page opened before Participant One took its only place. Action: register from that stale page. Expected: EVENT_FULL, no row for Participant Two. Actual: full-event message and Full state appear, and Register is removed.'),
      ('desktop/07-roster.png','7. Owner retrieves the roster | F-04 / AC-16','Role: owning Organizer. Start: one saved registration. Action: open event roster. Expected: only Participant One and count 1 of 1. Actual: the roster and count match the stored registration.'),
      ('desktop/08-after-restart.png','8. Retrieve after a real API restart | F-03, SYS-UI / AC-15, AC-18','Role: Participant One. Start: the API is stopped and restarted with a new process ID, using the same PostgreSQL data. Action: log in and retrieve registration. Expected: the same saved registration remains available. Actual: retrieval succeeds after restart.')]
    for i,(path,title,caption) in enumerate(shots):
        story.append(PageBreak())
        shot(base+path,title,caption,maxh=570)
    story.append(PageBreak())
    heading('Mobile and keyboard evidence | AC-18 / M-02')
    para('The same T-18 journey passed at 390x844. The separate keyboard walkthrough used Tab, Shift+Tab, Enter, Space and native date-field arrow keys. Busy, empty, loading, error/retry and success states were verified. Codex operated these checks; the source does not establish a student-run manual session or a screen-reader audit.')
    mobile=[]
    for f,caption in [('03-receipt.png','Mobile saved receipt'),('07-roster.png','Mobile owner roster')]:
        path=ROOT/base/'mobile'/f
        im=PILImage.open(path);sc=285/im.height
        mobile.append([Image(str(path),width=im.width*sc,height=285),p(caption,'caption')])
    story.append(Table([[mobile[0][0],mobile[1][0]],[mobile[0][1],mobile[1][1]]],colWidths=[CW/2,CW/2]))
    shot('docs/evidence/sprint-1/issue8/keyboard/desktop-01-login-focus.png','Login focus and labels | F-01 / AC-01','Role: seeded account user. Start: login page. Action: keyboard navigation between Email and Password. Expected and actual: visible labels and focus outline; the journey then uses real login/logout.',maxh=174)
    heading('Login, logout and backend rejection evidence',2)
    para('AC-01/04: authentication tests log in, store the original session cookie, log out and replay the old cookie. The database session is revoked, the cookie is cleared and both current-user calls return 401. The test excerpt below and the candidate regression results provide backend evidence beyond UI controls.')
    auth=read('server/tests/api/auth.test.ts')
    snippet=auth[auth.index("  test('logout revokes"):auth.index("  test('logout revokes")+3000]
    snippet=snippet.split('\n  test(')[0]
    story.append(code(snippet))
    source('server/tests/api/auth.test.ts; candidate regression: 100 server tests passed')
    heading('Protected roster API screen dump | F-04 / AC-17',3)
    para('Start: an event with two registrations owned by organizer1. Action: GET /api/events/1/registrations using each caller identity. Expected: only the owner receives participant data; anonymous 401, Participant 403, foreign Organizer 404. Actual: the stored API response artifact matches all expected statuses. This screen dump belongs to the earlier #6 implementation (55b4a15); the same access assertions passed in the candidate regression.')
    api=json.loads(read('docs/evidence/sprint-1/issue6-api.json'))
    story.append(table(['Caller','HTTP','Recorded response'],[[x['role'],str(x['status']),json.dumps(x['body']['error']) if 'error' in x['body'] else 'count: 2; two ACTIVE items; participant id, name and email only'] for x in api],[CW*.21,CW*.10,CW*.69]))
    source('docs/evidence/sprint-1/issue6-api.json')
    heading('F.5 Two actual automated test excerpts')
    heading('Domain rule: full event stores no extra registration | T-12 / AC-12',3)
    para('Source: server/tests/api/registration-capacity.test.ts. The fixture is a published future event with capacity 2 and two ACTIVE registrations. p3 is a separately authenticated Participant. These selected source lines preserve the setup, request and database assertions; unrelated import and lifecycle lines are omitted.')
    reg=read('server/tests/api/registration-capacity.test.ts')
    snippet=reg[reg.index('    const event ='):reg.index('\n  });',reg.index('    const event ='))]
    story.append(code(snippet))
    para('Recorded result: T-12 green has 7 passing tests across its API and unit files, 0 failures and 0 skips; the same API assertion is included in the 100-test candidate server regression.')
    heading('Authorization: wrong callers never query the roster | T-17 / AC-17',3)
    para('Source: server/tests/api/roster.test.ts. beforeAll creates two Organizers and two Participants, authenticates independent agents, creates an event owned by the first Organizer and inserts two registrations. The excerpt asserts both the safe response and that no roster query occurs for denied callers.')
    roster=read('server/tests/api/roster.test.ts')
    start=roster.index("test('T-17")
    story.append(code(roster[start:roster.index('\n});',start)+4]))
    para('Recorded result: roster.test.ts is part of the passing candidate server suite (100 passed, 0 failed, 0 skipped). Historical #6 direct API responses above independently retain the 401/403/404 outcomes.')
    heading('F.6 TDD and design-before-code history')
    story.append(table(['Record','Date / commit','Evidence'],[
      ['Specification and STS','3 Nov 2026 / 96d9a67','Contract/test design committed before implementation; merged through PR #10 at 28be4c5.'],
      ['Foundation implementation','5 Nov 2026 / d111892','Initial implementation; direct staging push later reverted and resubmitted in PR #11 without rewriting history.'],
      ['Capacity TDD red','6 Nov 2026 / 5e373f0','Two T-12 test files committed before registration rule implementation. API expected 409 but received 404; unit file could not import the missing rule.'],
      ['Capacity TDD green','6 Nov 2026 / d3d1c4a','Rule/API implemented; 2 test files and 7 tests pass. The two test files have an empty diff between red and green.'],
      ['Concurrency correction','6 Nov 2026 / 7582113','T-13 exposed three 500/P2028 responses under 10-way concurrency on JeenoXD\'s machine. Transaction wait increased; 503 fallback added; assertions unchanged.'],
      ['Integrated candidate','8 Nov 2026 / bc8b6ba','PR #16 merged; fresh-clone build, 146 regression tests and two browser journeys passed.'],
      ['Main release','8 Nov 2026 / 3f60d7c','PR #17 merged after teammate approval; application and test trees unchanged from the verified candidate.']],[CW*.23,CW*.25,CW*.52]))
    heading('Recorded red / green execution output',3)
    story.append(code('RED - 5e373f0, same T-12 command\nFAIL tests/api/registration-capacity.test.ts\nAssertionError: expected 404 to be 409\nTest Files  2 failed (2)\nTests       1 failed (1)\nThe unit file additionally failed to load the not-yet-written rule.\n\nGREEN - d3d1c4a\nTest Files  2 passed (2)\nTests       7 passed (7)\nAPI: capacity 2, two ACTIVE rows, third participant rejected.'))
    para('Command in server/: `npx vitest run tests/unit/registration-rules.test.ts tests/api/registration-capacity.test.ts`. The red result is an intended historical failure, not an unresolved final failure. T-11 and T-13 were written after code and are not claimed as red-first TDD.')
    source('docs/evidence/sprint-1/issue5-t12-red.txt and issue5-t12-green.txt')
    heading('F.7 Git workflow, reviews and contributions')
    para('Workflow: create each feature branch from current sprint1 -> PR into sprint1 -> teammate review -> integration and applicable tests -> reviewed sprint1-to-main release. Planned board states: Backlog, Specified, Started, PR Review, Fixing, Done. A failed check or requested change returns the work to Fixing.')
    rev=read('docs/sprints/sprint-1/reviewer.md')
    heading('Issue, branch, author and integration index',3)
    data=[['#1 / documentation','feature/issue1-docs','PR #10 / JeenoXD','Tell52 / 28be4c5'],['#2 / SYS-FOUND','feature/issue2-foundation','PR #11 / Tell52','JeenoXD / cf7ef4b'],['#3 / F-01','feature/issue3-auth','PR #12 / JeenoXD','Tell52 / 3a5f20b'],['#4 / F-02','feature/issue4-events','PR #13 / Tell52','JeenoXD / 345459c'],['#5 / F-03','feature/issue5-registration','PR #14 / JeenoXD','Tell52 / d1914a2'],['#6 / F-04','feature/issue6-roster','PR #15 / Tell52','JeenoXD / 7f5e4b2'],['#7 / SYS-UI','feature/issue7-verification','PR #16 / JeenoXD','Tell52 / bc8b6ba'],['#8 / release','sprint1 -> main','PR #17 / Tell52','JeenoXD / 3f60d7c']]
    story.append(table(['Issue / contract','Branch','PR / author','Reviewer / merge'],data,[CW*.19,CW*.30,CW*.23,CW*.28]))
    para('All eight Sprint 1 issues are closed; feature PRs #10-16 and release PR #17 are merged. The final GitHub project-board columns were not captured. Only Sprint 1 records are included here.')
    heading('Two sampled issue-to-release evidence chains',3)
    for num,feature,ac,branch,prn,author,reviewer,comment,reviewurl,merge in [
      (5,'F-03','AC-10-15','feature/issue5-registration',14,'JeenoXD','Tell52','nice bro','5799754924','d1914a2'),
      (6,'F-04','AC-16-17','feature/issue6-roster',15,'Tell52','JeenoXD','good job na bro very nice','5805731319','7f5e4b2')]:
        heading('Issue #'+str(num)+' / '+feature,3)
        para('['+'Issue #'+str(num)+']('+REPO+'/issues/'+str(num)+') -> `'+branch+'` -> [PR #'+str(prn)+']('+REPO+'/pull/'+str(prn)+') -> teammate approval -> staging merge `'+merge+'` -> candidate `bc8b6ba` -> release PR #17 -> main `3f60d7c`. Contract: Part E, '+feature+' / '+ac+'.')
        para('**Author:** '+author+'. **Reviewer:** '+reviewer+'. **Actual approval:** ["'+comment+'"]('+REPO+'/pull/'+str(prn)+'#pullrequestreview-'+reviewurl+'). **Technical verification:** '+('T-10-15, capacity TDD and database concurrency checks.' if num==5 else 'T-16/17, owner-only reads, rejected caller roles and responsive roster checks.'))
        para('**Review limitation:** the approval text contains no specific technical finding or reason. The chain demonstrates branch, PR, teammate approval and release ancestry; substantive technical review evidence is incomplete. Automated checks are not presented as the reviewer\'s personal work.')
    heading('Recorded team contributions',3)
    md(rev.split('## Team contributions')[1].split('## Process evidence')[0])
    para('Release update: Tell52 authored PR #17 and JeenoXD approved it. The older #8 contribution row above describes the pre-release audit; the merged release is now verified. No pair programming session or percentage split is inferred.')
    heading('AI-use declaration',3)
    para('Chutipon Homsuwan (JeenoXD) used Claude for documentation, design/test proposals and implementation assistance on Issues #1, #3, #5 and #7. Napat Tantipibulsap (Tell52) used Codex for Issue/AC preparation, implementation and tests on #2, #4 and #6, and candidate verification/evidence on #8. Codex also assembled and visually checked this English report on 12 November 2026.')
    para('Recorded student involvement includes JeenoXD comparing documentation to Issue #1, running the authentication suite locally (31 server and 9 client tests), committing and observing the T-12 red/green sequence, and detecting the T-13 concurrency failure on his machine. Tell52 confirmed event validation, privacy and integration decisions, prepared issues and coordinated release. M-01/M-02 were operated by Codex; no student manual execution is invented.')
    para('Corrections retained in the record include the reverted direct staging push, misplaced test files, the concurrency timeout, stale registration UI, mobile roster caption wrapping and a keyboard date-field harness problem. AI output was revised in response to tests and inspection. The complete project AI-use record remains at docs/sprints/sprint-1/ai-use.md.')
    heading('F.8 Local reproduction and safe demo access')
    para('Prerequisites: supported Node.js (20.19+, 22.12+, or 24+), npm, Docker Desktop with Linux containers/Compose v2 and Google Chrome (or installed Playwright Chromium). Use the immutable release below. Database ports are loopback-only: development 5433 and test 5434; API 3000, client 5173.')
    story.append(code('git clone https://github.com/Tell52/SE_GPRJ3.git\ncd SE_GPRJ3\ngit checkout '+REL+'\nCopy-Item .env.example .env\nCopy-Item server/.env.example server/.env\nCopy-Item server/.env.test.example server/.env.test\n# Configure local database and seed secrets, then:\ndocker compose --profile test up -d --wait\nnpm ci\nnpm run db:generate\nnpm run db:migrate\nnpm run db:seed\nnpm run build\nnpm test\nnpm run test:e2e'))
    para('Set a non-placeholder POSTGRES_PASSWORD in root .env. Put the matching encoded password in each server DATABASE_URL and choose local SEED_PASSWORD values. The test URL must use event_planner_test on port 5434; never target development or a shared database. Real secrets must stay out of Git, client variables and this report. Committed Prisma migrations include custom SQL constraints; prisma db push is not a substitute.')
    para('Run the UI/API in two terminals with `npm run dev:server` and `npm run dev:client`. E2E needs free API/UI ports because it starts its own processes and resets only the guarded test database. Seed accounts: organizer1@example.test, organizer2@example.test and participant1/2/3@example.test. Passwords come from your local SEED_PASSWORD. Repeating seed preserves existing passwords and event edits. API startup never resets data.')
    heading('F.9 Known limitations and evidence gaps')
    story.append(table(['Item','Impact / status'],[
      ['Substantive teammate review','Approvals exist for all feature PRs and the release. Available comments do not describe specific checks or findings. This criterion is not presented as fully evidenced.'],
      ['Final board capture','Unavailable; closed issue statuses are not a substitute for a final board screenshot.'],
      ['Accepted-main execution','Historical staging runs cover unchanged application/test trees, but no distinct post-merge main run is recorded.'],
      ['Manual attribution','Fresh-clone and keyboard checks were assistant-operated; human acceptance and screen-reader coverage are not established.'],
      ['Decision statuses','Several SRS decisions and contract-version review cells remain proposed or pending in the source. They are preserved transparently.'],
      ['Transaction load','Registration can wait up to 15 seconds and then return 503 SERVICE_BUSY without mutation. Sprint 3 performance target NFR-07 has not been measured.'],
      ['TDD scope','T-12 is red-first with unchanged tests. T-11/T-13 are useful regression checks but were written after implementation.'],
      ['Historical failures','Initial event-focus test, registration concurrency timeout, smoke locator/import issues and keyboard date-entry harness failures were corrected and retained; final candidate suites show zero failed/skipped tests.'],
      ['Later product work','Cancellation, deadlines, editing, event cancellation, check-in and reports are allocated to later sprints. Deployment is a future design in Part C; no later lab issue content is included.'],
      ['Reference baseline','The supplied handout refers to group_work_specs.docx. That master file was not supplied here; Theme 3/context are taken from the repository engineering baseline.']]))
    heading('F.10 Sources and version reconciliation')
    para('Engineering content was read at immutable release '+REL+'. The original 8 November documents include pre-release status text. This PDF reconciles that text using live GitHub PR #17 metadata, its teammate approval, Issue #8 closure and Git history checked on 12 November 2026. It does not alter the source repository or backdate its records.')
    story.append(table(['Source','Use in this report'],[
      ['project_deliverable_1_v1.pdf','Supplied assessment brief: Parts A-F, navigation, complete contracts and selected execution evidence.'],
      ['docs/srs.md; features.md; traceability.md','Full SRS, feature inventory and traceability in Parts A/B.'],
      ['docs/system-sds.md; docs/sprints/plan.md','Full system design and three-sprint allocation in Parts C/D.'],
      ['docs/sprints/sprint-1/specification.md; api-spec.md; ui-spec.md; tests.md','Complete Sprint 1 engineering contracts and STS in Part E; AC results in Part F.'],
      ['docs/evidence/sprint-1/issue8/','Candidate logs, walkthroughs, screenshots and verification record used in Part F.'],
      ['server/tests/api/registration-capacity.test.ts; roster.test.ts; auth.test.ts','Actual source excerpts for capacity, authorization and logout assertions.'],
      ['docs/sprints/sprint-1/reviewer.md; ai-use.md','Team attribution, review limitations and AI assistance.'],
      ['[Release PR #17]('+REPO+'/pull/17); [Issue #8]('+REPO+'/issues/8)','Current release/closure reconciliation; PR #14/#15 discussions substantiate the exact approval text.']]))

if __name__=='__main__':
    build();build()
    (TMP/'page_map.json').write_text(json.dumps(NAV,indent=2))
    print(json.dumps({'output':str(OUT),'pages':len(PdfReader(OUT).pages),'navigation':NAV}))
