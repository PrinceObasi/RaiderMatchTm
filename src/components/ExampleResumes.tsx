import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Building, MapPin, GraduationCap, Star, Award, Code, Briefcase, Users, AlertTriangle } from "lucide-react";

const exampleResumes = [
  {
    id: "chris",
    name: "Chris Carson",
    company: "Amazon",
    position: "Software Engineering Intern",
    location: "Lubbock, TX",
    gpa: "3.602",
    graduationYear: "2026",
    major: "Computer Science",
    achievements: [
      "Deans list award 5X",
      "Texas Tech presidential merit scholarship"
    ],
    workExperience: [
      {
        title: "Software Engineering Intern",
        company: "Zata Corp",
        duration: "Jun 2024 - Aug 2024",
        highlights: [
          "Independently identified and resolved 3 critical backend issues in Java and Python",
          "Led code review using GitHub pull requests and SonarQube",
          "Developed API integration for Apple Watch data using PostgreSQL, OAuth2, and Swagger",
          "Collaborated with senior engineers to debug backend issues using Wireshark and ELK Stack"
        ]
      },
      {
        title: "Community Advisor",
        company: "Texas Tech University",
        duration: "Aug 2024 - Present",
        highlights: [
          "Mentored and supported 50+ diverse residents",
          "Resolved conflicts and enforced university policies",
          "Conducted policy education sessions"
        ]
      }
    ],
    projects: [
      {
        name: "Real-time Chat Application",
        duration: "Mar 2023 - Aug 2023",
        technologies: ["React.js", "Firebase", "Vercel"],
        highlights: [
          "Developed real-time chat with Firebase Realtime Database",
          "Implemented Google authentication via Firebase",
          "Maintained message history for chat rooms"
        ]
      },
      {
        name: "Dynamic Event Scheduler",
        duration: "May 2024 - Sep 2024",
        technologies: ["Spring Boot 3.0", "JWT", "MySQL", "Swagger"],
        highlights: [
          "Developed RESTful API for event management",
          "Implemented secure authentication with JWT",
          "Designed scalable database schemas"
        ]
      }
    ],
    skills: [
      "Python", "Java", "C++", "SQL", "JavaScript", "Node.js", "React.js", 
      "Spring Boot", "AWS", "Firebase", "MySQL", "Docker", "Git"
    ]
  },
  {
    id: "damien",
    name: "Damien Anderson",
    company: "Meta",
    position: "Software Engineering Intern",
    location: "Lubbock, TX",
    gpa: "4.0",
    graduationYear: "2027",
    major: "Electrical & Computer Engineering",
    minor: "Mathematics",
    achievements: [
      "Presidential Scholar (2021-present)",
      "Dean's list (2022-present)",
      "President's honor list (2021)"
    ],
    workExperience: [
      {
        title: "PWC Remote Extern",
        company: "PwC",
        duration: "Sep 2024 - Oct 2024",
        highlights: [
          "Performed systematic analysis of program data across disability support organizations",
          "Architected comprehensive technical documentation system",
          "Executed research analysis of training programs"
        ]
      },
      {
        title: "Software Engineering Intern",
        company: "Arravo",
        duration: "Jun 2024 - Aug 2024",
        highlights: [
          "Developed web application 'Skilled Man' with team of interns",
          "Created responsive web pages using HTML, CSS, and React.js",
          "Implemented user sign-up functionality with data storage"
        ]
      }
    ],
    projects: [
      {
        name: "Traffic Light Control System",
        duration: "Mar 2024",
        technologies: ["Arduino", "Embedded C"],
        highlights: [
          "Engineered automated traffic light control using Arduino",
          "Designed state-machine logic for traffic flow optimization",
          "Implemented time-based state transitions"
        ]
      },
      {
        name: "Light-Tracking Sensor System",
        duration: "Nov 2023",
        technologies: ["Arduino", "C", "Servo Motors"],
        highlights: [
          "Developed autonomous light-following system",
          "Integrated photoresistors with servo motors",
          "Applied real-time tracking responses"
        ]
      }
    ],
    skills: [
      "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "Assembly", 
      "HTML", "CSS", "React.js", "MySQL", "Linux", "PostgreSQL", "Git", "Node.js"
    ],
    certifications: [
      "Meta Backend Developer Professional Certificate (In Progress)",
      "AWS Cloud Practitioner (In Progress)",
      "AT&T Technology Academy"
    ]
  },
  {
    id: "chiamaka",
    name: "Chiamaka Enusi",
    company: "Amazon",
    position: "Software Engineering Intern",
    location: "Houston, TX",
    gpa: "3.63",
    graduationYear: "2025",
    major: "Computer Science",
    college: "Texas Tech Honors College",
    achievements: [
      "Presidential Scholar (2021-present)",
      "Dean's list (2022-present)",
      "President's honor list (2021)"
    ],
    workExperience: [
      {
        title: "Research Assistant",
        company: "Cornell University Summer Research Workshop",
        duration: "Jul 2023",
        highlights: [
          "Engineered robot hardware with object recognition and path optimization",
          "Awarded 1st runner up for efficient robotics systems",
          "Collaborated on robotic assistive cane for visually impaired community"
        ]
      },
      {
        title: "Apple At-Home Advisor",
        company: "Apple Inc.",
        duration: "Jul 2023",
        highlights: [
          "Provided technical support for Apple hardware and software",
          "Improved daily customer satisfaction for 15+ clients",
          "Resolved customer complaints through effective communication"
        ]
      }
    ],
    projects: [
      {
        name: "Library Catalog System",
        technologies: ["Python"],
        highlights: [
          "Developed interactive digital interface for library",
          "Resulted in 35% increase in search efficiency"
        ]
      },
      {
        name: "Digital Restaurant Menu",
        technologies: ["Python"],
        highlights: [
          "Created Python-based menu system",
          "Served 30+ customers"
        ]
      },
      {
        name: "College-prep Website",
        technologies: ["HTML"],
        highlights: [
          "Designed web application for essay services",
          "Provided proofreading and editing services"
        ]
      }
    ],
    leadership: [
      {
        title: "Secretary",
        organization: "National Society of Black Engineers",
        duration: "May 2023 - Present",
        highlights: [
          "Heads Texas Tech Collegiate Communication's zone",
          "Delegates tasks to 10+ executive board members",
          "Increased revenue by 20% annually"
        ]
      },
      {
        title: "Regional Leadership Conference Chair",
        organization: "National Society of Black Engineers",
        duration: "May 2023 - Present",
        highlights: [
          "Organized leadership conference for 80+ participants",
          "Recruited volunteer committee for event execution"
        ]
      }
    ],
    skills: [
      "Python", "C", "HTML", "Verilog", "Assembly Language", 
      "Microsoft Office Suite", "Adobe Creative Cloud"
    ]
  }
];

export function ExampleResumes() {
  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium text-amber-800 dark:text-amber-200">Privacy Notice</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                The names and personal information of these former Texas Tech students have been changed for privacy protection. 
                These examples showcase the types of qualifications and experiences that helped TTU students secure internships at top companies.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="chris" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chris" className="text-xs sm:text-sm">
            Chris → Amazon
          </TabsTrigger>
          <TabsTrigger value="damien" className="text-xs sm:text-sm">
            Damien → Meta
          </TabsTrigger>
          <TabsTrigger value="chiamaka" className="text-xs sm:text-sm">
            Chiamaka → Amazon
          </TabsTrigger>
        </TabsList>

        {exampleResumes.map((resume) => (
          <TabsContent key={resume.id} value={resume.id} className="mt-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl">{resume.name}</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {resume.company} - {resume.position}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {resume.location}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2 shrink-0">
                    GPA: {resume.gpa}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Education */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Education
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <p className="font-medium">Texas Tech University</p>
                        <p className="text-sm text-muted-foreground">
                          Bachelor of Science in {resume.major}
                          {resume.minor && `, Minor in ${resume.minor}`}
                        </p>
                        {resume.college && (
                          <p className="text-sm text-muted-foreground">{resume.college}</p>
                        )}
                      </div>
                      <p className="text-sm font-medium">Class of {resume.graduationYear}</p>
                    </div>
                  </div>
                </div>

                {/* Achievements */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Achievements
                  </h3>
                  <div className="grid gap-2">
                    {resume.achievements.map((achievement, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 shrink-0" />
                        <span className="text-sm">{achievement}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Work Experience */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Work Experience
                  </h3>
                  <div className="space-y-4">
                    {resume.workExperience.map((job, idx) => (
                      <Card key={idx} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                            <div>
                              <p className="font-medium">{job.title}</p>
                              <p className="text-sm text-muted-foreground">{job.company}</p>
                            </div>
                            <Badge variant="outline">{job.duration}</Badge>
                          </div>
                          <ul className="space-y-1">
                            {job.highlights.map((highlight, highlightIdx) => (
                              <li key={highlightIdx} className="text-sm flex items-start gap-2">
                                <span className="text-primary mt-1.5 shrink-0">•</span>
                                <span>{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Projects
                  </h3>
                  <div className="space-y-4">
                    {resume.projects.map((project, idx) => (
                      <Card key={idx} className="border-l-4 border-l-secondary">
                        <CardContent className="pt-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                            <p className="font-medium">{project.name}</p>
                            {project.duration && (
                              <Badge variant="secondary">{project.duration}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {project.technologies.map((tech, techIdx) => (
                              <Badge key={techIdx} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                          <ul className="space-y-1">
                            {project.highlights.map((highlight, highlightIdx) => (
                              <li key={highlightIdx} className="text-sm flex items-start gap-2">
                                <span className="text-secondary mt-1.5 shrink-0">•</span>
                                <span>{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Leadership (for Chiamaka) */}
                {resume.leadership && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Leadership & Involvement
                    </h3>
                    <div className="space-y-4">
                      {resume.leadership.map((role, idx) => (
                        <Card key={idx} className="border-l-4 border-l-accent">
                          <CardContent className="pt-4">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                              <div>
                                <p className="font-medium">{role.title}</p>
                                <p className="text-sm text-muted-foreground">{role.organization}</p>
                              </div>
                              <Badge variant="outline">{role.duration}</Badge>
                            </div>
                            <ul className="space-y-1">
                              {role.highlights.map((highlight, highlightIdx) => (
                                <li key={highlightIdx} className="text-sm flex items-start gap-2">
                                  <span className="text-accent mt-1.5 shrink-0">•</span>
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications (for Damien) */}
                {resume.certifications && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Professional Certifications
                    </h3>
                    <div className="grid gap-2">
                      {resume.certifications.map((cert, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="text-sm">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Technical Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {resume.skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}