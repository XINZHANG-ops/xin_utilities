/**
 * Whiteboard Utility Functions
 *
 * Common utility functions for ID generation, color assignment,
 * coordinate conversion, and object cloning.
 *
 * Dependencies: Requires globals from state.js (REF_WIDTH, REF_HEIGHT, userColors)
 */

/**
 * Generate unique object ID (includes userId to prevent collisions across users)
 * @returns {string} Unique object identifier
 */
function generateObjectId() {
  const userId = localStorage.getItem('wb-user-id') || 'local';
  return 'obj_' + userId + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate consistent color for user based on name hash
 * @param {string} name - User name
 * @returns {string} Color hex code
 */
function generateUserColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return userColors[Math.abs(hash) % userColors.length];
}

/**
 * Generate random user name (adjective + noun + number)
 * @returns {string} Random name like "HappyPanda42"
 */
function generateRandomName() {
  const adjectives = ['Happy', 'Swift', 'Clever', 'Bright', 'Cool', 'Calm', 'Bold', 'Kind'];
  const nouns = ['Panda', 'Tiger', 'Eagle', 'Fox', 'Wolf', 'Bear', 'Owl', 'Hawk'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}${Math.floor(Math.random() * 100)}`;
}

/**
 * Convert object coordinates to ratio (for cross-device sync)
 * Removes local Image object that can't be serialized
 * @param {Object} obj - Object with pixel coordinates
 * @returns {Object} Object with ratio coordinates (0-1 range)
 */
function toRatio(obj) {
  const copy = JSON.parse(JSON.stringify(obj));
  // Remove local Image object (it can't be serialized properly and becomes {})
  delete copy.img;
  if (copy.x !== undefined) copy.x = copy.x / REF_WIDTH;
  if (copy.y !== undefined) copy.y = copy.y / REF_HEIGHT;
  if (copy.x1 !== undefined) copy.x1 = copy.x1 / REF_WIDTH;
  if (copy.y1 !== undefined) copy.y1 = copy.y1 / REF_HEIGHT;
  if (copy.x2 !== undefined) copy.x2 = copy.x2 / REF_WIDTH;
  if (copy.y2 !== undefined) copy.y2 = copy.y2 / REF_HEIGHT;
  if (copy.width !== undefined) copy.width = copy.width / REF_WIDTH;
  if (copy.height !== undefined) copy.height = copy.height / REF_HEIGHT;
  if (copy.points) {
    copy.points = copy.points.map(p => ({
      x: p.x / REF_WIDTH,
      y: p.y / REF_HEIGHT
    }));
  }
  return copy;
}

/**
 * Convert object coordinates from ratio to pixels (for cross-device sync)
 * @param {Object} obj - Object with ratio coordinates (0-1 range)
 * @returns {Object} Object with pixel coordinates
 */
function fromRatio(obj) {
  const copy = JSON.parse(JSON.stringify(obj));
  if (copy.x !== undefined) copy.x = copy.x * REF_WIDTH;
  if (copy.y !== undefined) copy.y = copy.y * REF_HEIGHT;
  if (copy.x1 !== undefined) copy.x1 = copy.x1 * REF_WIDTH;
  if (copy.y1 !== undefined) copy.y1 = copy.y1 * REF_HEIGHT;
  if (copy.x2 !== undefined) copy.x2 = copy.x2 * REF_WIDTH;
  if (copy.y2 !== undefined) copy.y2 = copy.y2 * REF_HEIGHT;
  if (copy.width !== undefined) copy.width = copy.width * REF_WIDTH;
  if (copy.height !== undefined) copy.height = copy.height * REF_HEIGHT;
  if (copy.points) {
    copy.points = copy.points.map(p => ({
      x: p.x * REF_WIDTH,
      y: p.y * REF_HEIGHT
    }));
  }
  return copy;
}

/**
 * Deep clone object for state saving (handles image objects)
 * Removes img element and keeps only imgSrc for serialization
 * @param {Object} obj - Object to clone
 * @returns {Object|null} Deep cloned object
 */
function cloneObjectState(obj) {
  if (!obj) return null;
  const clone = { ...obj };
  // Don't clone the img element, just keep imgSrc
  if (clone.img) delete clone.img;
  return JSON.parse(JSON.stringify(clone));
}
