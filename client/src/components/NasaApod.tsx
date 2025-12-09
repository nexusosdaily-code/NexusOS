import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  RefreshCw,
  Loader2,
  ExternalLink,
  Calendar,
  Camera,
  Video,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface ApodData {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  date: string;
  copyright?: string;
}

const NASA_DEMO_KEY = "DEMO_KEY";

export function NasaApod() {
  const [apod, setApod] = useState<ApodData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchApod = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const dateParam = date ? `&date=${date}` : '';
      const response = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${NASA_DEMO_KEY}${dateParam}`
      );
      
      if (!response.ok) {
        throw new Error(`NASA API returned ${response.status}`);
      }
      
      const data: ApodData = await response.json();
      setApod(data);
      setSelectedDate(data.date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch APOD');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApod();
  }, [fetchApod]);

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    const newDate = date.toISOString().split('T')[0];
    fetchApod(newDate);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      date.setDate(date.getDate() + 1);
      const newDate = date.toISOString().split('T')[0];
      fetchApod(newDate);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <Card className="bg-gradient-to-br from-indigo-900/20 to-violet-950/20 border-indigo-500/30 p-6" data-testid="nasa-apod">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <Star className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">NASA Astronomy Picture of the Day</h2>
            <p className="text-sm text-gray-400">Daily cosmic imagery from across the universe</p>
          </div>
        </div>
        <Button
          onClick={() => fetchApod()}
          disabled={loading}
          variant="outline"
          size="sm"
          className="border-slate-600"
          data-testid="btn-refresh-apod"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading && !apod ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : apod ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousDay}
                disabled={loading}
                data-testid="btn-prev-day"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(apod.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextDay}
                disabled={loading || isToday}
                data-testid="btn-next-day"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 flex items-center gap-1">
              {apod.media_type === 'video' ? (
                <><Video className="w-3 h-3" /> Video</>
              ) : (
                <><Camera className="w-3 h-3" /> Image</>
              )}
            </Badge>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-slate-700">
            {apod.media_type === 'video' ? (
              <iframe
                src={apod.url}
                title={apod.title}
                className="w-full aspect-video"
                allowFullScreen
              />
            ) : (
              <a href={apod.hdurl || apod.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={apod.url}
                  alt={apod.title}
                  className="w-full h-auto max-h-[400px] object-cover hover:opacity-90 transition-opacity"
                  data-testid="img-apod"
                />
              </a>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-2">{apod.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">
              {apod.explanation}
            </p>
            {apod.copyright && (
              <p className="text-xs text-gray-500 mt-2">
                © {apod.copyright}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <a
              href={apod.hdurl || apod.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View Full Resolution
            </a>
          </div>
        </div>
      ) : null}

      <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-gray-500 flex items-center justify-between">
        <span>Data source: NASA Open APIs</span>
        <a 
          href="https://api.nasa.gov/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-indigo-400 hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          api.nasa.gov
        </a>
      </div>
    </Card>
  );
}
