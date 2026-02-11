import React from 'react';

interface EventSidebarCardProps {
  date: string;
  time?: string;
  location: string;
  category?: string;
  capacity?: number;
  type?: string;
  isPublic: boolean;
}

const EventSidebarCard: React.FC<EventSidebarCardProps> = ({
  date,
  time,
  location,
  category,
  capacity,
  type,
  isPublic,
}) => {
  return (
    <aside className="bg-gray-50 p-6 rounded-lg space-y-4">
      <div>
        <h3 className="font-semibold text-lg">Event Info</h3>
        <p><span className="font-medium">Date:</span> {date}</p>
        {time && <p><span className="font-medium">Time:</span> {time}</p>}
        <p><span className="font-medium">Location:</span> {location}</p>
        {category && <p><span className="font-medium">Category:</span> {category}</p>}
        {capacity !== undefined && <p><span className="font-medium">Capacity:</span> {capacity}</p>}
        {type && <p><span className="font-medium">Type:</span> {type}</p>}
        <p><span className="font-medium">Public:</span> {isPublic ? 'Yes' : 'No'}</p>
      </div>

      <button
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
        disabled={!isPublic}
      >
        {isPublic ? 'Sign Up' : 'Coming Soon'}
      </button>
    </aside>
  );
};

export default EventSidebarCard;
