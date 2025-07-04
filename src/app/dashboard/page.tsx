'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/StatCard';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import {
  Users,
  Brain,
  Trophy,
  Globe,
  Download,
  FileSpreadsheet,
  Copy,
  TrendingUp,
  Clock,
  Target,
  Award,
  MapPin,
  Share,
  Mic,
  Pause,
  Play
} from 'lucide-react';
import {
  surveyResponses,
  responseDistributions,
  personaRankings,
  questionAnalytics,
  insights,
  dailyCompletions,
  traitInsights
} from '@/lib/mock-survey-data';
import mockUsers from '@/lib/mock-users';
import { generateBusinessReport, generateCSV } from '@/lib/export-utils';

interface TraitInsight {
  trait: string;
  count: number;
  description: string;
  color: string;
}

// Calculate dashboard stats
const dashboardStats = {
  totalResponses: surveyResponses.length,
  topPersona: personaRankings[0],
  averageXp: Math.round(surveyResponses.reduce((acc, curr) => acc + curr.xpGained, 0) / surveyResponses.length),
  topRegion: "Europe"
};

// Colors for charts
const COLORS = ['#9333ea', '#db2777', '#4f46e5', '#0891b2'];

export default function DashboardPage() {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Calculate country distribution
  const countryDistribution = useMemo(() => {
    const mainCountries = ['USA', 'UK', 'India', 'Japan', 'France', 'Germany', 'Australia'];
    
    const distribution = mockUsers.reduce((acc: { [key: string]: number }, user) => {
      let country = user.region.split(', ')[1] || user.region;
      
      // Normalize country names to match main countries
      if (country === 'United States' || country.includes('USA')) country = 'USA';
      else if (country === 'United Kingdom' || country.includes('UK')) country = 'UK';
      else if (!mainCountries.includes(country)) country = 'Other';
      
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution)
      .map(([country, count]) => ({ country, count }))
      .filter(item => item.country !== 'Other') // Remove "Other" category
      .sort((a, b) => b.count - a.count);
  }, []);

  // Handle export to CSV
  const handleExportCSV = () => {
    const headers = ['id', 'userId', 'surveyId', 'completedAt', 'xpGained'];
    const csvContent = generateCSV(surveyResponses, headers);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'survey_responses.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: "Survey responses have been exported to CSV",
    });
  };

  // Handle export to PDF/Report
  const handleExportReport = () => {
    const report = generateBusinessReport();
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'business_report.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Report Generated",
      description: "Business report has been generated and downloaded",
    });
  };

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle share insights button click
  const handleShareInsights = async () => {
    try {
      // If already playing, stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }

      const summary = generateSummary();
      
      toast({
        title: "Generating voice summary...",
        description: "Please wait while we process your request.",
      });

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: summary
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const newAudioUrl = URL.createObjectURL(audioBlob);
      
      // Clean up old audio URL if it exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      setAudioUrl(newAudioUrl);
      
      // Create new audio element
      const audio = new Audio(newAudioUrl);
      audioRef.current = audio;
      
      // Add event listeners
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        toast({
          title: "Error",
          description: "Failed to play audio",
          variant: "destructive",
        });
        setIsPlaying(false);
      });

      // Start playing
      await audio.play();
      setIsPlaying(true);
      
      toast({
        title: "Playing summary",
        description: "Your dashboard insights are being read aloud.",
      });

    } catch (error: any) {
      console.error('Error generating speech:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate voice summary",
        variant: "destructive",
      });
      setIsPlaying(false);
    }
  };

  // Clean up audio URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Generate summary text from mock data
  const generateSummary = () => {
    const topPersonas = personaRankings
      .slice(0, 2)
      .map(p => `${p.persona} at ${p.percentage}%`)
      .join(" and ");

    const topTraits = traitInsights
      .slice(0, 2)
      .map(t => t.trait)
      .join(" and ");

    const recentTrend = insights[0].description;
    const userSatisfaction = insights[2].description;

    const countryStats = countryDistribution
      .slice(0, 3)
      .map(c => c.country)
      .join(", ");

    return `
      Welcome to your PersonaSync Dashboard Summary.
      
      Our community is thriving with ${dashboardStats.totalResponses} total survey responses.
      The dominant personality types are ${topPersonas}.
      The most common traits observed are ${topTraits}.
      
      Recent trends show that ${recentTrend}.
      Regarding user satisfaction, ${userSatisfaction}.
      
      Our global community spans across ${countryStats}, with active members contributing daily.
      
      Users have earned an average of ${dashboardStats.averageXp} XP points through meaningful interactions.
      
      Thank you for being part of our growing community!
    `;
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          {audioUrl ? (
            <Button
              variant="outline"
              onClick={togglePlayPause}
              className="flex items-center gap-2"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'Pause Summary' : 'Play Summary'}
            </Button>
          ) : null}
          <Button onClick={handleShareInsights} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Generate Summary
          </Button>
        </div>
      </div>
      <div className="space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Survey Responses"
            value={dashboardStats.totalResponses}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Top Persona"
            value={dashboardStats.topPersona.persona}
            icon={Brain}
            trend={{ value: 5, isPositive: true }}
          />
          <StatCard
            title="Average XP Earned"
            value={dashboardStats.averageXp}
            icon={Trophy}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Top Region"
            value={dashboardStats.topRegion}
            icon={Globe}
            trend={{ value: 3, isPositive: true }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button onClick={handleExportCSV} className="bg-purple-600 hover:bg-purple-700">
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
          <Button onClick={handleExportReport} className="bg-pink-600 hover:bg-pink-700">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button onClick={handleShareInsights} className="bg-blue-600 hover:bg-blue-700">
            <Copy className="w-4 h-4 mr-2" />
            Share Insights
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Response Distribution Bar Chart */}
          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Response Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={responseDistributions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="response" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#9333ea" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Country Distribution Chart */}
          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <CardTitle>User Distribution by Country</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="country" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5">
                      {countryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Persona Distribution Pie Chart */}
          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Persona Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={personaRankings}
                      dataKey="count"
                      nameKey="persona"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {personaRankings.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Daily Completions Line Chart */}
          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Daily Completions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyCompletions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="completions" fill="#4f46e5" stroke="#4f46e5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Question Analytics */}
          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Question Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={questionAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="question" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="engagement" stroke="#9333ea" />
                    <Line type="monotone" dataKey="completion" stroke="#db2777" />
                  </LineChart>
                </ResponsiveContainer>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Insights */}
        <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 rounded-lg bg-white/30">
                  <div className="p-2 rounded-full bg-purple-100">
                    {index === 0 ? <TrendingUp className="w-5 h-5 text-purple-600" /> :
                     index === 1 ? <Target className="w-5 h-5 text-pink-600" /> :
                     <Award className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </DashboardLayout>
  );
} 