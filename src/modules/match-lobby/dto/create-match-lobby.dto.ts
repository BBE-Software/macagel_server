export class CreateMatchLobbyDto {
  title: string;
  description?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  date: string; // ISO date string
  duration?: number; // dakika
  max_players?: number;
  price_per_person?: number;
  is_private?: boolean;
  is_reward_match?: boolean;
  reward_description?: string;
}