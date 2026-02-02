import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

type MenuItemProps = {
  title: string;
  icon?: React.ReactNode;
  subText?: string;
};

const menuItems: MenuItemProps[] = [
  {
    title: "Home",
  },
  {
    title: "Expenses",
  },
  {
    title: "Dashboard",
  },
  {
    title: "TODOs",
  },
];

const MenuItems = () => {
  return (
    <Box>
      <List>
        {menuItems.map((item, i) => (
          <ListItem key={`${item}--${i}`}>
            <ListItemButton>
              <ListItemIcon>{item?.icon}</ListItemIcon>
              <ListItemText secondary={item.title} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default MenuItems;
