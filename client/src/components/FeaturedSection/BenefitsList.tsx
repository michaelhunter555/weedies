import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

const benefits = [
  "Lab-tested products (COA available)",
  "Discreet packaging",
  "Fast local pickup or delivery options",
  "Secure checkout",
  "Fresh inventory",
];

const BenefitsList = () => {
  return (
    <List>
      {benefits.map((val, i) => (
        <ListItem key={i}>
          <ListItemIcon>
            <CheckCircleIcon color="success" sx={{ fontSize: 15 }} />
          </ListItemIcon>
          <ListItemText secondary={val} />
        </ListItem>
      ))}
    </List>
  );
};

export default BenefitsList;
