const Category = require('../services/services-service/models/Category');
const mongoose = require('mongoose');

const categories = [
  {
    name: 'electrician',
    displayName: 'Electricians',
    description: 'Electrical installation, repair, and maintenance services',
    icon: 'zap',
    subcategories: [
      { name: 'installation', displayName: 'Electrical Installation', description: 'New electrical installations' },
      { name: 'repair', displayName: 'Electrical Repair', description: 'Electrical troubleshooting and repairs' },
      { name: 'wiring', displayName: 'House Wiring', description: 'Complete house wiring services' },
      { name: 'lighting', displayName: 'Lighting Solutions', description: 'Indoor and outdoor lighting' }
    ],
    sortOrder: 1,
    metadata: {
      featured: true,
      color: '#F59E0B'
    }
  },
  {
    name: 'plumber',
    displayName: 'Plumbers',
    description: 'Plumbing installation, repair, and maintenance services',
    icon: 'wrench',
    subcategories: [
      { name: 'leak-repair', displayName: 'Leak Repair', description: 'Fix water leaks and pipe issues' },
      { name: 'installation', displayName: 'Plumbing Installation', description: 'New plumbing installations' },
      { name: 'drain-cleaning', displayName: 'Drain Cleaning', description: 'Unclog drains and sewers' },
      { name: 'water-heater', displayName: 'Water Heater Services', description: 'Water heater repair and installation' }
    ],
    sortOrder: 2,
    metadata: {
      featured: true,
      color: '#3B82F6'
    }
  },
  {
    name: 'tutor',
    displayName: 'Tutors',
    description: 'Academic tutoring and educational support services',
    icon: 'book-open',
    subcategories: [
      { name: 'math', displayName: 'Mathematics', description: 'Math tutoring for all levels' },
      { name: 'science', displayName: 'Science', description: 'Physics, Chemistry, Biology tutoring' },
      { name: 'languages', displayName: 'Languages', description: 'Language learning and support' },
      { name: 'computer', displayName: 'Computer Science', description: 'Programming and computer skills' }
    ],
    sortOrder: 3,
    metadata: {
      featured: true,
      color: '#10B981'
    }
  },
  {
    name: 'cleaner',
    displayName: 'House Cleaning',
    description: 'Professional house cleaning and maintenance services',
    icon: 'home',
    subcategories: [
      { name: 'regular', displayName: 'Regular Cleaning', description: 'Weekly or monthly house cleaning' },
      { name: 'deep', displayName: 'Deep Cleaning', description: 'Thorough deep cleaning services' },
      { name: 'move-in-out', displayName: 'Move-in/Move-out', description: 'Cleaning for moving situations' },
      { name: 'commercial', displayName: 'Commercial Cleaning', description: 'Office and commercial space cleaning' }
    ],
    sortOrder: 4,
    metadata: {
      featured: true,
      color: '#8B5CF6'
    }
  },
  {
    name: 'fitness',
    displayName: 'Fitness Trainers',
    description: 'Personal fitness training and wellness coaching',
    icon: 'activity',
    subcategories: [
      { name: 'personal', displayName: 'Personal Training', description: 'One-on-one fitness training' },
      { name: 'group', displayName: 'Group Classes', description: 'Group fitness classes' },
      { name: 'yoga', displayName: 'Yoga Instruction', description: 'Yoga classes and instruction' },
      { name: 'nutrition', displayName: 'Nutrition Coaching', description: 'Diet and nutrition guidance' }
    ],
    sortOrder: 5,
    metadata: {
      featured: false,
      color: '#EF4444'
    }
  },
  {
    name: 'mechanic',
    displayName: 'Auto Mechanics',
    description: 'Vehicle repair and maintenance services',
    icon: 'tool',
    subcategories: [
      { name: 'repair', displayName: 'Auto Repair', description: 'General vehicle repairs' },
      { name: 'maintenance', displayName: 'Maintenance', description: 'Regular vehicle maintenance' },
      { name: 'diagnostic', displayName: 'Diagnostic', description: 'Vehicle diagnostic services' },
      { name: 'bodywork', displayName: 'Body Work', description: 'Auto body repair and painting' }
    ],
    sortOrder: 6,
    metadata: {
      featured: false,
      color: '#6B7280'
    }
  },
  {
    name: 'gardener',
    displayName: 'Gardening & Landscaping',
    description: 'Garden maintenance and landscaping services',
    icon: 'tree-pine',
    subcategories: [
      { name: 'maintenance', displayName: 'Garden Maintenance', description: 'Regular garden upkeep' },
      { name: 'landscaping', displayName: 'Landscaping', description: 'Landscape design and installation' },
      { name: 'tree-care', displayName: 'Tree Care', description: 'Tree trimming and removal' },
      { name: 'lawn-care', displayName: 'Lawn Care', description: 'Lawn mowing and maintenance' }
    ],
    sortOrder: 7,
    metadata: {
      featured: false,
      color: '#059669'
    }
  },
  {
    name: 'painter',
    displayName: 'Painters',
    description: 'Interior and exterior painting services',
    icon: 'palette',
    subcategories: [
      { name: 'interior', displayName: 'Interior Painting', description: 'Indoor painting services' },
      { name: 'exterior', displayName: 'Exterior Painting', description: 'Outdoor painting services' },
      { name: 'commercial', displayName: 'Commercial Painting', description: 'Business and office painting' },
      { name: 'decorative', displayName: 'Decorative Painting', description: 'Specialty and decorative finishes' }
    ],
    sortOrder: 8,
    metadata: {
      featured: false,
      color: '#F97316'
    }
  }
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/localconnect_services');
    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert new categories
    await Category.insertMany(categories);
    console.log('Categories seeded successfully');

    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding categories:', error);
    mongoose.connection.close();
  }
}

if (require.main === module) {
  seedCategories();
}

module.exports = { categories, seedCategories };
