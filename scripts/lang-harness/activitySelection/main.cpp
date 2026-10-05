#include "algo.cpp"
#include <iostream>
#include <sstream>
int main() {
    std::string l1, l2;
    std::getline(std::cin, l1); std::getline(std::cin, l2);
    std::istringstream a(l1), b(l2);
    std::vector<double> st, en; double x;
    while (a >> x) st.push_back(x);
    while (b >> x) en.push_back(x);
    std::vector<Activity> acts;
    for (size_t i = 0; i < st.size(); i++) acts.push_back({"A" + std::to_string(i), st[i], en[i]});
    auto r = activitySelection(acts);
    for (size_t k = 0; k < r.size(); k++) std::cout << (k ? " " : "") << r[k];
    std::cout << "\n";
}
