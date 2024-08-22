const User = require('../model/userSchema');
const Product = require('../model/productSchema');
const Order = require('../model/orderSchema');

const adminLayout = './layouts/adminLayouts';

function getDateRange(dateRange) {
  const currentDate = new Date();
  let startDate;
  let endDate = currentDate;

  switch (dateRange) {
    case 'day':
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      break;
    case 'week':
      const firstDayOfWeek = currentDate.getDate() - currentDate.getDay();
      startDate = new Date(currentDate.setDate(firstDayOfWeek));
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      break;
    case 'custom':
      throw new Error("Custom date range requires startDate and endDate");
    default:
      throw new Error("Invalid date range");
  }

  return { startDate, endDate };
}

const getProductOrderAnalysis = async (dateRange, filterDate) => {
  try {
    const { startDate, endDate } = getDateRange(dateRange);  // Use the helper function to get the date range

    const data = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.product_id": { $exists: true }, createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: "$items.product_id",
          totalQuantity: { $sum: "$items.quantity" },
          totalSales: { $sum: "$items.itemTotal" }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          productName: "$product.product_name", // Make sure the field name matches the schema
          totalQuantity: 1,
          totalSales: 1
        }
      }
    ]);

    return data;
  } catch (error) {
    throw new Error(`Error in getProductOrderAnalysis: ${error.message}`);
  }
};


const getCategoryOrderAnalysis = async (dateRange, filterDate) => {
  try {
    const { startDate, endDate } = getDateRange(dateRange);

    if (filterDate) {
      startDate.setDate(new Date(filterDate).getDate());
    }

    const data = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.product_id": { $exists: true }, createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories", // Assuming the collection is named 'categories'
          localField: "product.category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category.name", // Use the category name field
          totalQuantity: { $sum: "$items.quantity" },
          totalSales: { $sum: "$items.itemTotal" }
        }
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalQuantity: 1,
          totalSales: 1
        }
      }
    ]);

    return data;
  } catch (error) {
    throw new Error(`Error in getCategoryOrderAnalysis: ${error.message}`);
  }
};


module.exports = {
  getDashboard: async (req, res) => {
    const locals = { title: "Gift Shop - Dashboard" };

    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();

    res.render("admin/dashboard", {
      locals,
      userCount,
      productCount,
      orderCount,
      layout: adminLayout,
    });
  },


  getUserList: async (req, res) => {
    const locals = {
      title: "Customers",
    };
    let perPage = 3;
    let page = req.query.page || 1;
    const users = await User.aggregate([{ $sort: { createdAt: -1 } }])
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();
    const count = await Product.find().countDocuments({});
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);
    res.render("admin/users/users", {
      locals,
      users,
      current: page,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
      perPage,

      layout: adminLayout

    }
    )
  },
  toggleBlock: async (req, res) => {
    try {
      let user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.isBlocked = !user.isBlocked;
      await user.save();
      res
        .status(200)
        .json({
          message: user.isBlocked
            ? "User blocked successfully"
            : "User unblocked successfully",
        });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },



  ChartCtrl: async (req, res) => {
    const { filterType, dateRange, filterDate } = req.query;

    try {
      let data;
      if (filterType === 'products') {
        data = await getProductOrderAnalysis(dateRange, filterDate);
      } else if (filterType === 'categories') {
        data = await getCategoryOrderAnalysis(dateRange, filterDate);
      } else {
        return res.status(400).json({ error: 'Invalid filterType' });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ message: 'No data found' });
      }

      res.json(data);
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
