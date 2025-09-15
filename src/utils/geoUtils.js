import db from '../database/connection.js';
import { users, wastePickerProfiles } from '../database/schema.js';
import { eq, and, sql } from 'drizzle-orm';

// Calculate distance between two points using Haversine formula
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Find nearby waste pickers within a given radius
export async function findNearbyWastePickers(latitude, longitude, radiusKm = 10) {
  try {
    // Get all active waste pickers with location data
    const wastePickers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        email: users.email,
        latitude: users.latitude,
        longitude: users.longitude,
        rating: users.rating,
        serviceRadius: wastePickerProfiles.serviceRadius,
        specializations: wastePickerProfiles.specializations,
        isVerified: wastePickerProfiles.isVerified
      })
      .from(users)
      .leftJoin(wastePickerProfiles, eq(users.id, wastePickerProfiles.userId))
      .where(and(
        eq(users.role, 'waste_picker'),
        eq(users.status, 'active'),
        sql`${users.latitude} is not null`,
        sql`${users.longitude} is not null`
      ));

    // Filter by distance and service radius
    const nearbyPickers = wastePickers.filter(picker => {
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(picker.latitude),
        parseFloat(picker.longitude)
      );

      const maxRadius = Math.min(radiusKm, picker.serviceRadius || 10);
      return distance <= maxRadius;
    });

    // Add distance to each picker and sort by distance
    const pickersWithDistance = nearbyPickers.map(picker => ({
      ...picker,
      distance: calculateDistance(
        latitude,
        longitude,
        parseFloat(picker.latitude),
        parseFloat(picker.longitude)
      )
    }));

    // Sort by distance (closest first)
    pickersWithDistance.sort((a, b) => a.distance - b.distance);

    return pickersWithDistance;

  } catch (error) {
    console.error('Error finding nearby waste pickers:', error);
    return [];
  }
}

// Calculate optimized route for multiple pickup points
export function calculateOptimizedRoute(startPoint, pickupPoints) {
  // This is a simplified implementation
  // In a real application, you'd use a proper routing algorithm like TSP solver
  // or integrate with Google Maps Directions API
  
  if (!pickupPoints || pickupPoints.length === 0) {
    return [];
  }

  const unvisited = [...pickupPoints];
  const route = [];
  let currentPoint = startPoint;

  while (unvisited.length > 0) {
    // Find the nearest unvisited point
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(
      currentPoint.latitude,
      currentPoint.longitude,
      unvisited[0].latitude,
      unvisited[0].longitude
    );

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        unvisited[i].latitude,
        unvisited[i].longitude
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // Add nearest point to route and remove from unvisited
    const nearestPoint = unvisited.splice(nearestIndex, 1)[0];
    route.push({
      ...nearestPoint,
      distanceFromPrevious: nearestDistance
    });

    currentPoint = nearestPoint;
  }

  return route;
}

// Get route statistics
export function getRouteStatistics(route) {
  if (!route || route.length === 0) {
    return {
      totalDistance: 0,
      totalPoints: 0,
      estimatedTime: 0
    };
  }

  const totalDistance = route.reduce((sum, point) => {
    return sum + (point.distanceFromPrevious || 0);
  }, 0);

  const totalPoints = route.length;
  
  // Estimate time: 30 km/h average speed + 15 minutes per pickup
  const estimatedTime = (totalDistance / 30) * 60 + (totalPoints * 15);

  return {
    totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimal places
    totalPoints,
    estimatedTime: Math.round(estimatedTime) // Round to nearest minute
  };
}

// Check if point is within service area
export function isWithinServiceArea(userLat, userLon, serviceAreas) {
  // Service areas could be defined as polygons, circles, or administrative boundaries
  // This is a simplified implementation using circular areas
  
  for (const area of serviceAreas) {
    const distance = calculateDistance(
      userLat,
      userLon,
      area.centerLat,
      area.centerLon
    );

    if (distance <= area.radius) {
      return true;
    }
  }

  return false;
}

// Get location suggestions based on partial input
export async function getLocationSuggestions(query, limit = 5) {
  // In a real application, you'd integrate with a geocoding service
  // like Google Places API or Mapbox Geocoding API
  
  // This is a mock implementation
  const mockSuggestions = [
    { name: 'Lagos Island, Lagos', lat: 6.4541, lon: 3.3947 },
    { name: 'Victoria Island, Lagos', lat: 6.4281, lon: 3.4219 },
    { name: 'Ikeja, Lagos', lat: 6.5954, lon: 3.3364 },
    { name: 'Abuja, FCT', lat: 9.0579, lon: 7.4951 },
    { name: 'Port Harcourt, Rivers', lat: 4.8156, lon: 7.0498 }
  ];

  return mockSuggestions
    .filter(location => 
      location.name.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, limit);
}

// Validate coordinates
export function validateCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, message: 'Coordinates must be valid numbers' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, message: 'Latitude must be between -90 and 90' };
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, message: 'Longitude must be between -180 and 180' };
  }

  return { valid: true, latitude: lat, longitude: lon };
}

// Get bounds for a set of coordinates
export function getBounds(coordinates) {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLon = coordinates[0].longitude;
  let maxLon = coordinates[0].longitude;

  for (const coord of coordinates) {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLon = Math.min(minLon, coord.longitude);
    maxLon = Math.max(maxLon, coord.longitude);
  }

  return {
    southwest: { latitude: minLat, longitude: minLon },
    northeast: { latitude: maxLat, longitude: maxLon },
    center: {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2
    }
  };
}